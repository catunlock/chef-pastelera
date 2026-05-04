import http.server
import socketserver
import json
import os
import urllib.parse
from datetime import datetime

PORT = 8000
DIRECTORY = "."

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_POST(self):
        if self.path == '/api/upload':
            self.handle_upload()
        elif self.path == '/api/data':
            self.handle_data_save()
        else:
            self.send_error(404, "Endpoint not found")

    def handle_upload(self):
        try:
            filename = self.headers.get('X-File-Name')
            if not filename:
                self.send_error(400, "Missing X-File-Name header")
                return
            
            # Sanitize filename and add timestamp
            name, ext = os.path.splitext(filename)
            safe_name = "".join(x for x in name if x.isalnum() or x in "._-")
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            final_filename = f"{safe_name}_{timestamp}{ext}"
            
            length = int(self.headers.get('Content-Length'))
            data = self.rfile.read(length)
            
            os.makedirs('images', exist_ok=True)
            filepath = os.path.join('images', final_filename)
            
            with open(filepath, 'wb') as f:
                f.write(data)
                
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            response = {"url": f"images/{final_filename}"}
            self.wfile.write(json.dumps(response).encode('utf-8'))
            
        except Exception as e:
            self.send_error(500, f"Upload failed: {str(e)}")

    def handle_data_save(self):
        try:
            length = int(self.headers.get('Content-Length'))
            body = self.rfile.read(length)
            data = json.loads(body.decode('utf-8'))
            
            with open('data.json', 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
                
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
            
        except Exception as e:
            self.send_error(500, f"Save failed: {str(e)}")

with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
    print(f"Server running at http://localhost:{PORT}")
    print("Press Ctrl+C to stop")
    httpd.serve_forever()
