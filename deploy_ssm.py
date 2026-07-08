import boto3
import time

ssm = boto3.client('ssm', region_name='us-east-1')

bash_script = """
su - ubuntu -c '
if [ ! -d ~/UCE-Nexus-Monorepo ]; then
    git clone -b QA https://github.com/Sarlacc3010/UCE-Nexus-Monorepo.git ~/UCE-Nexus-Monorepo
fi
cd ~/UCE-Nexus-Monorepo
git fetch origin QA
git reset --hard origin/QA
export DEPLOY_ENV=QA
export DOCKER_HUB_TAG=qa
docker-compose -f infra/docker/docker-compose.prod.yml pull
docker-compose -f infra/docker/docker-compose.prod.yml up -d
docker ps
'
"""

response = ssm.send_command(
    InstanceIds=['i-0db344b5e42b8222b'],
    DocumentName='AWS-RunShellScript',
    Parameters={'commands': [bash_script]}
)

command_id = response['Command']['CommandId']
print(f"Command ID: {command_id}")

for _ in range(12):
    time.sleep(10)
    invocation = ssm.get_command_invocation(CommandId=command_id, InstanceId='i-0db344b5e42b8222b')
    status = invocation['Status']
    print(f"Status: {status}")
    if status in ['Success', 'Failed']:
        print("Output:\n", invocation['StandardOutputContent'])
        if invocation['StandardErrorContent']:
            print("Error:\n", invocation['StandardErrorContent'])
        break
