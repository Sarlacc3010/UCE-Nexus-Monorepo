import boto3

ec2 = boto3.client('ec2', region_name='us-east-1')
res = ec2.describe_instances()

print("EC2 Instances:")
for r in res['Reservations']:
    for i in r['Instances']:
        name = next((t['Value'] for t in i.get('Tags', []) if t['Key'] == 'Name'), 'Unknown')
        print(f"{name}: ID={i['InstanceId']}, State={i['State']['Name']}, PublicIP={i.get('PublicIpAddress', 'None')}, PrivateIP={i.get('PrivateIpAddress', 'None')}")
