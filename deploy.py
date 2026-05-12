
import subprocess
import sys

def run_command(command):
    print(f"Executing: {command}")
    process = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    
    for line in process.stdout:
        print(line, end="")
    
    process.wait()
    return process.returncode

def deploy():
    # 기본 프로젝트 설정 (필요 시 수정 가능)
    project_id = "data-test-96fc2"
    
    print(f"--- Starting Deployment to {project_id} ---")
    
    # 1. 프로젝트 선택 확인 (이미 .firebaserc에 설정되어 있지만 명시적으로 use 실행 가능)
    # run_command(f"firebase use {project_id}")
    
    # 2. 배포 실행
    result = run_command("firebase deploy --only hosting")
    
    if result == 0:
        print("\n[SUCCESS] Deployment completed successfully!")
    else:
        print(f"\n[ERROR] Deployment failed with exit code {result}")
        sys.exit(result)

if __name__ == "__main__":
    deploy()
