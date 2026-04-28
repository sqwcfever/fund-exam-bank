#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
基金从业资格题库 - 简单部署脚本
使用 localtunnel 或 ngrok 进行内网穿透
"""

import subprocess
import sys
import os
import time
import webbrowser

def main():
    print("=" * 50)
    print("   基金从业资格题库 - 一键部署")
    print("=" * 50)
    print()
    
    # 检查是否安装了 localtunnel
    print("[1/3] 检查 localtunnel...")
    result = subprocess.run(["npx", "lt", "--version"], capture_output=True, text=True)
    if result.returncode != 0:
        print("   正在安装 localtunnel...")
        subprocess.run(["npm", "install", "-g", "localtunnel"], check=True)
    print("   ✓ localtunnel 已就绪")
    print()
    
    # 启动 HTTP 服务器
    print("[2/3] 启动本地服务器...")
    import http.server
    import socketserver
    import threading
    
    PORT = 8080
    DIRECTORY = os.path.dirname(os.path.abspath(__file__))
    
    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    httpd = socketserver.TCPServer(("", PORT), Handler)
    
    def start_server():
        httpd.serve_forever()
    
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()
    print(f"   ✓ 本地服务器已启动: http://localhost:{PORT}")
    print()
    
    # 启动 localtunnel
    print("[3/3] 创建公网访问链接...")
    print("   正在连接，请稍候...")
    print()
    
    try:
        # 使用 localtunnel 创建公网链接
        result = subprocess.run(
            ["npx", "localtunnel", "--port", str(PORT), "--subdomain", "fund-exam-bank-2024"],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            # 解析输出获取链接
            for line in result.stdout.split('\n'):
                if 'url:' in line.lower() or 'http' in line:
                    url = line.strip()
                    if url.startswith('http'):
                        print("=" * 50)
                        print("   部署成功！")
                        print("=" * 50)
                        print()
                        print(f"   访问链接: {url}")
                        print()
                        print("   提示：")
                        print("   - 首次访问可能需要等待 10-20 秒")
                        print("   - 链接有效期为当前会话期间")
                        print("   - 关闭此窗口后链接失效")
                        print()
                        webbrowser.open(url)
                        break
        else:
            print("   localtunnel 输出:")
            print(result.stdout)
            print(result.stderr)
            
    except subprocess.TimeoutExpired:
        print("   连接超时，尝试备用方案...")
        print()
        print("=" * 50)
        print("   备用方案")
        print("=" * 50)
        print()
        print("   本地服务器已启动: http://localhost:8080")
        print()
        print("   请手动使用以下方式创建公网链接：")
        print("   1. 访问 https://ngrok.com")
        print("   2. 注册并下载 ngrok")
        print("   3. 运行: ngrok http 8080")
        print()
    
    print("按 Ctrl+C 停止服务器")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n服务器已停止")
        httpd.shutdown()

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"错误: {e}")
        input("按回车键退出...")
