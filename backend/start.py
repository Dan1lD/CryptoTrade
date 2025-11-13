#!/usr/bin/env python3
import subprocess
import sys
import os
import signal

def run_servers():
    """Start both FastAPI and Vite dev server"""
    print("Starting P2P Crypto Trading Platform...")
    
    # Start FastAPI server
    print("Starting FastAPI backend on port 5000...")
    fastapi_process = subprocess.Popen(
        [sys.executable, "main.py"],
        cwd=os.path.join(os.path.dirname(__file__)),
    )
    
    # Start Vite dev server (it will proxy API requests to FastAPI)
    print("Starting Vite frontend...")
    vite_process = subprocess.Popen(
        ["npx", "vite", "--port", "5173", "--host", "0.0.0.0"],
        cwd=os.path.join(os.path.dirname(__file__), ".."),
    )
    
    def cleanup(signum, frame):
        print("\nShutting down servers...")
        fastapi_process.terminate()
        vite_process.terminate()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)
    
    print("Servers started! Backend: http://0.0.0.0:5000, Frontend: http://0.0.0.0:5173")
    
    # Wait for both processes
    try:
        fastapi_process.wait()
        vite_process.wait()
    except KeyboardInterrupt:
        cleanup(None, None)

if __name__ == "__main__":
    run_servers()
