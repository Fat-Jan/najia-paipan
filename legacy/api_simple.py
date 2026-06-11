#!/usr/bin/env python3
"""
六爻排盘 API 测试脚本
使用 http.server 和 json 实现简单的 REST API
"""

import json
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse, parse_qs

sys.path.insert(0, str(Path(__file__).parent / 'najia'))

from najia import Najia
from najia.batch import BatchProcessor

class APIHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass
    
    def send_json_response(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False, indent=2).encode('utf-8'))
    
    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        
        if path == '/' or path == '/api/v1':
            self.send_json_response({
                "name": "六爻排盘 API",
                "version": "1.0.0",
                "description": "基于 najia 优化核心的六爻排盘服务",
                "endpoints": [
                    {"path": "/api/v1/paipan", "method": "POST", "description": "单个排盘"},
                    {"path": "/api/v1/paipan/batch", "method": "POST", "description": "批量排盘"},
                    {"path": "/api/v1/paipan/text", "method": "POST", "description": "文本渲染"},
                ]
            })
        elif path == '/api/v1/gua/64':
            from najia.const import GUA64, GUAS
            from najia.utils import set_shi_yao, palace
            
            gua_list = []
            for mark, name in GUA64.items():
                try:
                    shiy = set_shi_yao(mark)
                    gong_idx = palace(mark, shiy[0])
                    gong_name = GUAS[gong_idx] if 0 <= gong_idx < len(GUAS) else "未知"
                except Exception:
                    gong_name = "未知"
                
                gua_list.append({
                    "mark": mark,
                    "name": name,
                    "gong": gong_name
                })
            
            self.send_json_response({"total": len(gua_list), "gua_list": gua_list})
        else:
            self.send_json_response({"error": "Not found"}, 404)
    
    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8')
        
        try:
            data = json.loads(body) if body else {}
        except json.JSONDecodeError:
            self.send_json_response({"error": "Invalid JSON"}, 400)
            return
        
        if path == '/api/v1/paipan':
            self.handle_single_paipan(data)
        elif path == '/api/v1/paipan/batch':
            self.handle_batch_paipan(data)
        elif path == '/api/v1/paipan/text':
            self.handle_paipan_text(data)
        else:
            self.send_json_response({"error": "Not found"}, 404)
    
    def handle_single_paipan(self, data):
        try:
            params = data.get('params')
            if not params or len(params) != 6:
                self.send_json_response({"error": "params must be a list of 6 integers (1-4)"}, 400)
                return
            
            if not all(1 <= x <= 4 for x in params):
                self.send_json_response({"error": "params values must be between 1 and 4"}, 400)
                return
            
            najia = Najia(verbose=0)
            najia.compile(
                params=params,
                date=data.get('date', ''),
                gender=data.get('gender', ''),
                title=data.get('title', ''),
                guaci=data.get('guaci', False)
            )
            
            result = najia.export()
            self.send_json_response(result)
            
        except Exception as e:
            self.send_json_response({"error": f"排盘失败: {str(e)}"}, 400)
    
    def handle_batch_paipan(self, data):
        try:
            params_list = data.get('params_list', [])
            if not params_list:
                self.send_json_response({"error": "params_list is required"}, 400)
                return
            
            processor = BatchProcessor(
                max_workers=data.get('max_workers', 4),
                timeout=30
            )
            
            result = processor.process_batch(
                params_list=params_list,
                dates=data.get('dates'),
                genders=data.get('genders'),
                titles=data.get('titles'),
                guaci=data.get('guaci', False)
            )
            
            self.send_json_response({
                "success_count": result.success_count,
                "error_count": result.error_count,
                "processing_time": result.processing_time,
                "errors": result.errors,
                "results": [
                    {
                        "params": item.params,
                        "name": item.name,
                        "mark": item.mark
                    }
                    for item in result.results
                ]
            })
            
        except Exception as e:
            self.send_json_response({"error": f"批量排盘失败: {str(e)}"}, 400)
    
    def handle_paipan_text(self, data):
        try:
            params = data.get('params')
            if not params or len(params) != 6:
                self.send_json_response({"error": "params must be a list of 6 integers (1-4)"}, 400)
                return
            
            najia = Najia(verbose=0)
            najia.compile(
                params=params,
                date=data.get('date', ''),
                gender=data.get('gender', ''),
                title=data.get('title', ''),
                guaci=data.get('guaci', False)
            )
            
            text_result = najia.render()
            
            self.send_json_response({
                "text": text_result,
                "params": params,
                "name": najia.result.name if najia.result else None
            })
            
        except Exception as e:
            self.send_json_response({"error": f"排盘失败: {str(e)}"}, 400)


def run_server(port=8000):
    server = HTTPServer(('0.0.0.0', port), APIHandler)
    print(f"========================================")
    print(f"  六爻排盘 API 服务")
    print(f"========================================")
    print(f"  访问地址:")
    print(f"    - API:     http://localhost:{port}")
    print(f"    - 64卦:    http://localhost:{port}/api/v1/gua/64")
    print(f"========================================")
    print(f"  API 端点:")
    print(f"    POST /api/v1/paipan      - 单个排盘")
    print(f"    POST /api/v1/paipan/batch - 批量排盘")
    print(f"    POST /api/v1/paipan/text  - 文本渲染")
    print(f"========================================")
    print(f"\n按 Ctrl+C 停止服务\n")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n服务已停止")
        server.shutdown()


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='六爻排盘 API 服务')
    parser.add_argument('--port', type=int, default=8000, help='端口号 (默认: 8000)')
    args = parser.parse_args()
    
    run_server(args.port)
