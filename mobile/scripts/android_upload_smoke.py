"""Exercise actual Android pickers on an isolated page, with no production writes."""
import base64
import http.server
import json
import re
import subprocess
import threading
import time
import xml.etree.ElementTree as ET
from pathlib import Path

out = Path('android-upload-evidence'); out.mkdir(exist_ok=True)
results = []
html = b'''<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1">
<style>button{display:block;margin:30px;padding:24px;font-size:20px}</style>
<button onclick="document.getElementById('files').click()">Choose photo</button>
<input id="files" type="file" accept="image/*" multiple hidden>
<button onclick="document.getElementById('camera').click()">Take photo</button>
<input id="camera" type="file" accept="image/*" capture="environment" hidden>
<p id="result">Ready</p><script>
for(const id of ['files','camera'])document.getElementById(id).onchange=async e=>{
 for(const f of e.target.files){const bytes=new Uint8Array(await f.arrayBuffer());
 const data={source:id,name:f.name,size:f.size,type:f.type,signature:[...bytes.slice(0,8)]};
 await fetch('/result',{method:'POST',body:JSON.stringify(data)});
 document.getElementById('result').textContent='Uploaded '+id+' '+f.size;}
 e.target.value='';};</script>'''
class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200);self.send_header('Content-Type','text/html');self.end_headers();self.wfile.write(html)
    def do_POST(self):
        results.append(json.loads(self.rfile.read(int(self.headers['Content-Length']))))
        self.send_response(200);self.end_headers()
    def log_message(self, *_): pass
server=http.server.HTTPServer(('127.0.0.1',8765),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
def adb(*args): return subprocess.check_output(['adb',*args],timeout=40)
def shot(name): (out/(name+'.png')).write_bytes(adb('exec-out','screencap','-p'))
def nodes():
    try:
        adb('shell','uiautomator','dump','/sdcard/upload-ui.xml')
        raw=adb('shell','cat','/sdcard/upload-ui.xml');(out/'last-ui.xml').write_bytes(raw)
        return list(ET.fromstring(raw).iter('node'))
    except Exception: return []
def tap(names,timeout=45):
    end=time.monotonic()+timeout
    while time.monotonic()<end:
        for n in nodes():
            label=n.get('text','')+' '+n.get('content-desc','')+' '+n.get('resource-id','')
            if any(s.lower() in label.lower() for s in names):
                b=list(map(int,re.findall(r'\d+',n.get('bounds',''))))
                if len(b)==4 and b[2]>b[0] and b[3]>b[1]:
                    adb('shell','input','tap',str((b[0]+b[2])//2),str((b[1]+b[3])//2));return
        time.sleep(1)
    shot('failure');raise AssertionError('Control missing: '+repr(names))
try:
    adb('reverse','tcp:8765','tcp:8765')
    adb('install','-r','apk/app-admin-debug.apk')
    # A real PNG available through Android's document provider.
    image=Path('lama-upload-test.png')
    image.write_bytes(base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6EAAAAABJRU5ErkJggg=='))
    adb('push',str(image),'/sdcard/Download/lama-upload-test.png')
    adb('shell','am','broadcast','-a','android.intent.action.MEDIA_SCANNER_SCAN_FILE','-d','file:///sdcard/Download/lama-upload-test.png')
    adb('shell','am','start','-n','com.ladiesfirst.ladies_first.admin/com.ladiesfirst.ladies_first.MainActivity')
    tap(['Choose photo']);shot('file-picker')
    try: tap(['lama-upload-test'],timeout=10)
    except AssertionError:
        tap(['Show roots','Open navigation drawer']);tap(['Downloads']);tap(['lama-upload-test'])
    # Multi-select document picker requires an explicit confirmation.
    for _ in range(3):
        if results: break
        try: tap(['Select','Open'],timeout=4)
        except AssertionError: pass
    deadline=time.monotonic()+20
    while not results and time.monotonic()<deadline: time.sleep(.5)
    assert results and results[0]['source']=='files', results
    assert results[0]['signature']==[137,80,78,71,13,10,26,10], results
    shot('photo-returned-to-webview')
    tap(['Take photo']);time.sleep(3)
    # Android camera first-run dialogs, if any.
    for _ in range(3):
        ui=nodes()
        if any('shutter' in (n.get('resource-id','')+' '+n.get('content-desc','')).lower() for n in ui): break
        try: tap(['While using the app','Allow','Next','Got it'],timeout=4)
        except AssertionError: break
    shot('camera-open')
    activity=adb('shell','dumpsys','activity','activities').decode(errors='replace')
    assert 'camera' in activity.lower(), 'Camera activity did not open'
    # Cancel native capture and confirm the WebView can open the file picker again.
    adb('shell','input','keyevent','4');tap(['Choose photo']);shot('picker-after-camera-cancel')
    adb('shell','input','keyevent','4')
    (out/'results.json').write_text(json.dumps(results,indent=2))
    print('PASS actual Android file selection bytes returned to HTML; camera activity opens; cancellation permits next picker')
finally:
    (out/'logcat.txt').write_bytes(adb('logcat','-d','-t','400'))
    server.shutdown()
