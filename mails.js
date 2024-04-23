const Imap = require('imap');
const simpleParser = require('mailparser').simpleParser;
const fs = require('fs')
const { Buffer } = require('node:buffer')

const { ipcRenderer } = require("electron");
const ipc=ipcRenderer; // just for shortened name

window.addEventListener('load', () => {

    document.querySelector("#minimize").addEventListener("click", () => {
      ipc.send("manualMinimize");
    });
  
    document.querySelector("#maximize").addEventListener("click", () => {
      ipc.send("manualMaximize");
    });
  
    document.querySelector("#close").addEventListener("click", () => {
      ipc.send("manualClose");
    });
  
    //Put App in the Background
    document.querySelector("#backgroundBtn").addEventListener("click", () => {
      ipc.send("voidApp");
    });
  
    const getVersion = async () => {
      
      document.querySelector("footer").innerHTML += await ipc.invoke("getVersion");
    }
  
    getVersion();
})

const imapConfig = {
    user: 'robin.schulze',
    password: 'r.schulze.r',
    host: 'ik.schule',
    port: 143,
    tls: false,
    autotls: 'required'
}

const mailViewerContainer = document.getElementById('mailViewerContainer')
const mailPlaceholder = document.getElementById('mailPlaceholder')
const attachmentDownloadContainer = document.getElementById('attachmentDownloadContainer')
const attachmentSize = document.getElementById('attachmentSize')

var attachmentBuffer = [];
var attachmentFileName = [];

var deleteMsg

const getMails = (bLoadAllMails, msgID, tableRowIndex) => {

    try {
        const imap = new Imap(imapConfig);
        var table = document.getElementById('table');
        
        mailPlaceholder.style.position = 'relative'
        mailPlaceholder.style.right = '0'
        mailViewerContainer.style.position = 'absolute'
        mailViewerContainer.style.right = '999999em'


        imap.once('ready', () => {
            imap.openBox('INBOX', false, (err, box) => {
                if (bLoadAllMails) {
                    table.innerHTML = ' '
                    imap.search(['UNSEEN'], (err, results) => {
                        if (!results || err) {
                            console.log(err)
                        }
                        else if(results != 0){
                            const f = imap.fetch(results, {bodies: ''});
                            f.on('message', msg => {
                                console.log(msg)
                                msg.on('body', stream => {
                                    
                                    simpleParser(stream, async (err, parsed) => {
                                        if (err) {
                                            console.error(err)
                                            
                                        }
                                        var date = parsed.date

                                        timestamp = date.getTime()
                                        date = date.getDate() + '.' +  (date.getMonth() + 1) + '.' + date.getFullYear()
                                        table.innerHTML += '<tr onclick="log(this)" class="mailRow unseen" data-msgID="' + parsed.headers.get('message-id') + '"><td><span id="sideMailFrom">' + parsed.from.value[0].name + '</span> <span id="sideMailDate" data-timestamp="'+ timestamp +'">'+ date +'</span><span id="sideMailSubject">'+ parsed.subject +'</span></td></tr>'
                                    })
                                })
                            })
                        }
                    })
                    imap.search(['SEEN'], (err, results) => {
                        const f = imap.fetch(results, {bodies: ''});
                        f.on('message', msg => {
                            msg.on('body', stream => {
                                
                                simpleParser(stream, async (err, parsed) => {
                                    if (err) {
                                        console.error(err)
                                    }
                                    var date = parsed.date
                                    timestamp = date.getTime()
                                    date = date.getDate() + '.' +  (date.getMonth() + 1) + '.' + date.getFullYear()
                                    table.innerHTML += '<tr onclick="log(this)" class="mailRow" data-timestamp="'+ timestamp +'" data-msgID="' + parsed.headers.get('message-id') + '"><td><span id="sideMailFrom">' + parsed.from.value[0].name + '</span> <span id="sideMailDate" data-timestamp="'+ timestamp +'">'+ date +'</span><span id="sideMailSubject">'+ parsed.subject +'</span></td></tr>'
                                    
                                })
                            })
                        })

                        f.once('end', () => {
                            setTimeout(() => {
                                sort()
                                console.log('arsch')
                              }, "50");
                        })

                    })


                }
                else if (msgID != null) {

                    imap.search( [["HEADER", "message-id", msgID]], (err, results) => {
                        const f = imap.fetch(results, {bodies: ''});
                        f.on('message', msg => {
                            msg.on('body', stream => {
                                simpleParser(stream, async (err, parsed) => {
                                    if (err) {
                                        console.error(err)
                                    }
                                    subject = document.getElementById('mailViewerSubject')
                                    subject.innerHTML = parsed.subject

                                    mainTextField = document.getElementById('mailViewerText')
                                    mainTextField.innerHTML = parsed.textAsHtml

                                    
                                    
                                    //table.innerHTML += '<tr onclick="log(this)" class="mailRow" data-cc=' + parsed + '><td>' + parsed.from.value[0].name + '<br><span>'+ parsed.subject +'</span></td></tr>'
                                    mailViewerContainer.style.position = 'relative'
                                    mailViewerContainer.style.right = '0'

                                    mailPlaceholder.style.position = 'absolute'
                                    mailPlaceholder.style.right = '999999em'


                                    if (parsed.attachments.length > 0) {
                                        parsed.attachments.forEach((attachment, i) => {
                                            attachmentDownloadContainer.innerHTML += "<span onclick='downloadAttachment(this)' data-bufferIndex='"+ i +"'><span id='attachmentDownloadFileName'>" + attachment.filename + "</span><span id='attachmentSize'>" + Math.round(attachment.size / 1000 ) + " KB</span><i class='fa fa-download'></i></span>"

                                            attachmentBuffer.push(Buffer.from(attachment.content))
                                            attachmentFileName.push(attachment.filename)
                                        })

                                        
                                    }

                                    
                                })
                            })

                            msg.once('attributes', attrs => {
                                const {uid} = attrs;
                                console.log(attrs)
                                imap.addFlags(uid, ['\\SEEN'], (err) => {
                                    if (err) {
                                        console.error(err)
                                    }
                                    console.log('added flag "read"')
                                })
                                deleteMsg = () => {
                                    if(confirm('Du bist im begriff eine E-Mail zu löschen!')){
                                        imap.addFlags(uid, ['\\DELETED'], (err) => {
                                            if (err) {
                                                console.error(err)
                                            }
                                        })
                                        table.deleteRow(tableRowIndex)
                                        mailViewerContainer.style.position = 'absolute'
                                        mailViewerContainer.style.right = '999999em'
                                        mailPlaceholder.style.position = 'relative'
                                        mailPlaceholder.style.right = '0'
                                    }
                                }
                                
                            })
                        })
                    })
                }
                
            })
            
        })

        
        

        imap.connect()
    } catch (error) {
        console.error(error);
    }
};

getMails(true);

const arsch = document.getElementById('mailViewerText')

async function log(e){
    mailPlaceholder.style.position = 'relative'
    mailPlaceholder.style.right = '0'
    mailViewerContainer.style.position = 'absolute'
    mailViewerContainer.style.right = '999999em'
    attachmentBuffer = [];
    attachmentFileName = [];
    attachmentDownloadContainer.innerHTML = '<div class="attachmentDownloadHeading"><h4>Anhänge</h4><i class="fa fa-file"></i></div>'
    msgID = e.getAttribute('data-msgID')
    msgObject = getMails(false, msgID, e.rowIndex)
}

function downloadAttachment(e) {
    fs.writeFileSync(attachmentFileName[e.getAttribute('data-bufferIndex')], attachmentBuffer[e.getAttribute('data-bufferIndex')], 'base64')
}



function sort(){
        var rows, switching, i, x, y, shouldSwitch;
        table = document.getElementById("table");
        switching = true;
        /*Make a loop that will continue until
        no switching has been done:*/
        while (switching) {
            //start by saying: no switching is done:
            switching = false;
            rows = table.rows;
            /*Loop through all table rows (except the
            first, which contains table headers):*/
            for (i = 0; i < (rows.length - 0); i++) {
            //start by saying there should be no switching:
            shouldSwitch = false;
            /*Get the two elements you want to compare,
            one from current row and one from the next:*/
            x = rows[i].getElementsByTagName("TD")[0].getElementsByTagName('span')[1].getAttribute('data-timestamp');
            y = rows[i + 1].getElementsByTagName("TD")[0].getElementsByTagName('span')[1].getAttribute('data-timestamp');
            //check if the two rows should switch place:
            if (parseInt(x) < parseInt(y)) {
                //if so, mark as a switch and break the loop:
                shouldSwitch = true;
                break;
            }
            }
            if (shouldSwitch) {
            /*If a switch has been marked, make the switch
            and mark that a switch has been done:*/
            rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
            switching = true;
            }
        }
}

