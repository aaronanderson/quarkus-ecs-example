# Example Quarkus Web Application running on Amazon Web Services (AWS) Elastic Container Service (ECS) Fargate

This example and following guide provides detailed instructions on how to develop, build, and deploy a [Quarkus](https://quarkus.io/) web application on [ECS](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/Welcome.html)

I created this guide to share my experience with developing a Quarkus web application and setting up ECS via the AWS CLI tool. I prefer to use the CLI over manual configuration through the AWS console for the following reasons:

* reproducibility - It is easy to delete resources, tweak commands for different application environments, and perform configuration management

* AWS console is constantly evolving

* AWS console tasks often perform several actions in the background. Only by using the CLI can one truely understand configuration dependencies and relationships.

Most likely [CloudFormation](https://aws.amazon.com/cloudformation/) could be used to script the full ECS configuration as well.

## Application Overview
This example is a simple web component and React based application that interacts with a Java [MicroProfile](https://microprofile.io/) resource. [Quarkus](https://quarkus.io/) is used as the Microservice Java runtime to service both web application requests and REST requests. 

[Webpack](https://webpack.js.org/) is used to build and bundle the web assets. The application is based on [Web Components](https://www.webcomponents.org/introduction) and includes [Preact](https://preactjs.com/) for compatability with the vibrant React component ecosystem. [Material UI](https://material-ui.com/) is used for theming. [TypeScript](https://www.typescriptlang.org/) is used for enhanced readability and Java-like type checking. 

[ALB OIDC Authentication](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/listener-authenticate-users.html) is used for application authentication. Note that AWS will substitute it's own signed JWT with the one provided by the OIDC IDP. Perhaps this is so AWS doesn't have to cache an external JWT in their environment and all the security liability that entails. In any event the AWS JWT the application receives is useless outside of the AWS environment so if the JWT is needed for external service calls it would be best to implement the [Quarkus OIDC extension](https://quarkus.io/guides/security-openid-connect-web-authentication) and access and validate the token directly in the application. 

Currently there is a defect with [SmallRye JWT](https://github.com/smallrye/smallrye-jwt/issues/143) that will soon be fixed but requires a local patch to work around.

This example does not the [Quarkus GraalVM native image](https://quarkus.io/guides/building-native-image) option. GraalVM only supports JDK 8 at the moment and it requires all classes to be registered at build time which can be tedious for moderate applications. Instead the application runs in a traditional JVM in a Docker image with JDK 13.

The ECS configuration below references qa in the configuration signifying the setup is for a staging environment. This naming convention is not an AWS concept but is used for a best practice of creating multiple testing environments beyond a production configuration. A production configuration can be created by setting the docker environment variable to prod and then re-running all the configuration in the ECS section starting at the ALB subsection and removing the qa- prefix.  

## Environment

* Operating System - This example was tested with Ubuntu 19.10
* JDK -  [OpenJDK 13](https://jdk.java.net/13/)
* IDE -  [Eclipse IDE](https://www.eclipse.org/downloads/packages/release/2019-09/r/eclipse-ide-enterprise-java-developers)
* Docker - [Install](https://docs.docker.com/install/linux/docker-ce/ubuntu/) 
* NPM
* Yarn
* Apache Maven
* AWS CLI - All configurations were deployed to the AWS us-west-1 region.


## Quarkus Build

### Web Build
Change directories to web and run `yarn`. Confirm the build is successful.

Run `yarn webpack` to build the sample preact application.

Alternatively run `yarn webpack-dev-server` to start the webpack development server at [http://localhost:8080](http://localhost:8080). Requests to /api will be forwarded to the Quarkus server when it is running. The development server hot deploy and automatic build upon change can rapidly speed up development time.



### Server
From the project root directory run `mvn package` to build the project.

Run `mvn -Dquarkus.profile=qa compile quarkus:dev` to start the Quarkus server. When run this way the server starts up in local development mode so that any resource or Java code change is immediately applied.

Access [http://localhost:5000/health/ready](http://localhost:5000/health/ready) to confirm the application is running.

Access [http://localhost:5000/api/example/hello](http://localhost:5000/api/example/hello) to confirm the REST resource is accessible.

Access [http://localhost:5000](http://localhost:5000) to confirm the presentation page is accessible.



### Docker

Perform the following to build a docker image of the application and upload it to AWS [ECR](https://aws.amazon.com/ecr/) 

```
mvn package
docker build -f src/main/docker/Dockerfile.jvm -t quarkus/quarkus-ecs-example-jvm .
docker tag quarkus/quarkus-ecs-example-jvm 999999999999.dkr.ecr.us-west-1.amazonaws.com/quarkus-ecs-example:latest
aws ecr get-login --no-include-email --region us-west-1
```
copy and paste generated docker login command. Confirm authentication.

`docker push 999999999999.dkr.ecr.us-west-1.amazonaws.com/quarkus-ecs-example:latest`





##AWS Setup

### Services Used
Here is a list of the services that will be used:

* IAM - security roles
* VPC 
* EC2 - ALB load balancer
* ECR
* ECS
* CloudWatch - ECS logs
* Route 53
* Certificate Manager

### Account
An [AWS account](https://portal.aws.amazon.com/billing/signup#/start) is required.

### IAM Account
Setup an admin user that has access to create and configure the services above. Here is a non-exhaustive list of policies:

* AmazonEC2FullAccess
* AmazonS3FullAccess
* AmazonECS_FullAccess
* AmazonRoute53FullAccess
* AWSCertificateManagerFullAccess

Once the account is created capture the AWS Key ID and Access Key for future reference.

### AWS CLI 

Install the [AWS CLI](https://aws.amazon.com/cli/)

Run the following to cache the CLI credentials
```
aws configure

AWS Access Key ID [****************XXXX]:
AWS Secret Access Key [****************xxxx]:
Default region name [us-east-1]: us-west-1
Default output format [None]:
```

The value `999999999999` represents an AWS account ID that is included in all ARNs. Be sure to replace this value in the commands below with the correct value for the account.

### VPC Network
The first thing that is needed for any Cloud application is network access. [AWS VPS](https://aws.amazon.com/vpc/details/) allows one to setup a secure isolated network in an AWS region. For my requirements I only needed to use one prexisting VPS for all my services since I don't need service isolation. If one is working with a [multi-tenanted](https://en.wikipedia.org/wiki/Multitenancy) Cloud application with multiple clients setting up individual networks should be done.   

#### Optional
If an existing VPC is available these commands are completely optional.

create a new network for the related services. ALB requires at least two subnets in two different availability zones

```
aws ec2 create-vpc --cidr-block 192.168.0.0/16
aws ec2 create-tags --tags Key=Name,Value=quarkus-ecs-example --resources vpc-09965b6122d79cb4d

aws ec2 modify-vpc-attribute --vpc-id vpc-09965b6122d79cb4d --enable-dns-support
aws ec2 modify-vpc-attribute --vpc-id vpc-09965b6122d79cb4d --enable-dns-hostnames


aws ec2 create-internet-gateway
aws ec2 create-tags  --resources igw-0de905c445f0b1990 --tags Key=Name,Value=quarkus-ecs-example


aws ec2 attach-internet-gateway  --internet-gateway-id igw-0de905c445f0b1990 --vpc-id vpc-09965b6122d79cb4d

aws ec2 create-route-table --vpc-id vpc-09965b6122d79cb4d
aws ec2 create-tags  --resources rtb-084d3b649446d2a47 --tags Key=Name,Value=quarkus-ecs-example

aws ec2 create-route --route-table-id rtb-084d3b649446d2a47 --destination-cidr-block "0.0.0.0/0"  --gateway-id igw-0de905c445f0b1990


aws ec2 create-subnet --vpc-id vpc-09965b6122d79cb4d --cidr-block 192.168.1.0/24 --availability-zone us-west-1b
aws ec2 create-tags --tags Key=Name,Value=quarkus-ecs-example --resources subnet-064aeec2a4f4c7618
aws ec2 modify-subnet-attribute  --subnet-id subnet-064aeec2a4f4c7618 --map-public-ip-on-launch
aws ec2 associate-route-table  --subnet-id subnet-064aeec2a4f4c7618 --route-table-id rtb-084d3b649446d2a47

aws ec2 create-subnet --vpc-id vpc-09965b6122d79cb4d --cidr-block 192.168.2.0/24 --availability-zone us-west-1c
aws ec2 create-tags --tags Key=Name,Value=quarkus-ecs-example --resources subnet-06219c0dd5c1667f3
aws ec2 modify-subnet-attribute  --subnet-id subnet-06219c0dd5c1667f3 --map-public-ip-on-launch
aws ec2 associate-route-table  --subnet-id subnet-06219c0dd5c1667f3 --route-table-id rtb-084d3b649446d2a47



```

If there are any problems with outbound requests to the Internet confirm the routing table configured above is set as the main routing table.

### Route 53
I created a single hosted zone for my main domain name through the UI. 

```
aws route53 create-hosted-zone --name example.com --caller-reference 2019-11-01-00:00 --hosted-zone-config Comment="quarkus-ecs-example"
```

### ALB
[Application Load Balancers](https://aws.amazon.com/blogs/aws/new-advanced-request-routing-for-aws-application-load-balancers/) support host header conditions and a maximum of 100 rules so a single ALB is usually all that is needed for all application needs.

The commands below create an ALB listing for SSL requests on port 443 for the main domain example.com. Any direct requests to this domain or any rule unmatched requests will redirect to quarkus.io.


I didn't get the AWS certificate manager validation emails so I manually registered the certificates using DNS authentication in the UI. Also route 53 setup is a simple one step process in the UI. 
```
aws acm request-certificate --domain-name example.com

aws ec2 create-security-group --vpc-id vpc-09965b6122d79cb4d --description "Quarkus ECS Example ALB Network Rules" --group-name quarkus-ecs-example-alb 

aws ec2 create-tags --tags Key=Name,Value=quarkus-ecs-example --resources sg-0b8fe3e5f1b7c8876

aws ec2 authorize-security-group-ingress --group-id sg-0b8fe3e5f1b7c8876 --protocol tcp --port 443 --cidr 0.0.0.0/0

aws elbv2 create-load-balancer --name quarkus-ecs-example --type application --scheme internet-facing  --security-groups sg-0b8fe3e5f1b7c8876 --subnets subnet-064aeec2a4f4c7618 subnet-06219c0dd5c1667f3 

aws elbv2 create-listener --load-balancer-arn arn:aws:elasticloadbalancing:us-west-1:999999999999:loadbalancer/app/quarkus-ecs-example/8649d45ac4b2b99b --protocol HTTPS --port 443  --certificates CertificateArn=arn:aws:acm:us-west-1:999999999999:certificate/8c09d4a0-5be5-496f-8251-940cb603cbb3 --default-actions Type=redirect,Order=1,RedirectConfig="{Protocol=HTTPS,Port=443,Host=quarkus.io,Path=/,Query=,StatusCode=HTTP_301}"

aws route53 change-resource-record-sets --hosted-zone-id XXXXXXXXXX --change-batch file://route53-example.json
```

route53-example.json:
```
{
  "Comment": "Quarkus ECS Example Root Domain Alias",
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
            "AliasTarget": {
                "HostedZoneId": "XXXXXXXXXXXX",
                "EvaluateTargetHealth": false,
                "DNSName": "dualstack.quarkus-ecs-example-000000000.us-west-1.elb.amazonaws.com."
            },
            "Type": "A",
            "Name": "example.com."
        }
    }
  ]
}


```

Optional HTTP access can be added as well. 

```
aws elbv2 create-listener --load-balancer-arn arn:aws:elasticloadbalancing:us-west-1:999999999999:loadbalancer/app/quarkus-ecs-example/8649d45ac4b2b99b --protocol HTTP --port 80  --default-actions Type=redirect,Order=1,RedirectConfig="{Protocol=HTTPS,Port=443,Host=quarkus.io,Path=/,Query=,StatusCode=HTTP_301}"

aws ec2 authorize-security-group-ingress --group-id sg-0b8fe3e5f1b7c8876 --protocol tcp --port 80 --cidr 0.0.0.0/0
```



### ECR

`aws ecr create-repository --repository-name quarkus-ecs-example --region us-west-1`


### ECS - Fargate

#### Task Security
Create a service role for the task

`aws iam create-role --path /service-role/ --role-name ecs-task-quarkus-ecs-example-service-role --assume-role-policy-document file://ecs-tasks-create-role.json`


ecs-tasks-create-role.json
```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

Typically an application deployed to AWS would access other services like DynamoDB, ElasticSearch, etc. This example does not but if it did AWS service permissions could be added to the role with the following command:


`aws iam put-role-policy --role-name ecs-task-quarkus-ecs-example-service-role --policy-name QuarkusECSExampleServiceRolePolicy --policy-document file://quarkus-ecs-example-put-role-policy.json`


quarkus-ecs-example-put-role-policy.json:

```
{
  "Version": "2012-10-17",
  "Statement": [
		{
			"Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:GetObjectVersion",
                "s3:ListBucket",
                "s3:ListBucketVersions",
                "s3:GetBucketLocation"
            ],
			"Resource": [
			    "arn:aws:s3:::example-bucket",
			    "arn:aws:s3:::example-bucket/*"
			],
			"Effect": "Allow"
		},		
		{
			"Action": [
				"dynamodb:Query",
				"dynamodb:GetItem",
				"dynamodb:PutItem",
				"dynamodb:UpdateItem",
				"dynamodb:DeleteItem",
				"dynamodb:BatchGetItem",
				"dynamodb:BatchWriteItem",
				"dynamodb:Scan"
			],
			"Resource": [
			    "arn:aws:dynamodb:us-west-1:999999999999:table/ExampleTable",
			    "arn:aws:dynamodb:us-west-1:999999999999:table/ExampleTable/index/*",
			    "arn:aws:dynamodb:us-west-1:999999999999:table/ExampleTable/stream/*"
			],
			"Effect": "Allow"
		},
    {
            "Effect": "Allow",
            "Action": [
                "es:*"
            ],
            "Resource": [
                "arn:aws:es:us-west-1:999999999999:domain/example-index",
                "arn:aws:es:us-west-1:999999999999:domain/example-index/*"
            ]
    },
		{
			"Action": [
				"lambda:InvokeFunction"
			],
			"Resource": [
				"arn:aws:lambda:us-west-1:999999999999:function:ExampleLambda"
			],
			"Effect": "Allow"
		},
		{
			"Action": [
				"logs:CreateLogStream",
				"logs:PutLogEvents"
			],
			"Resource": [
				"arn:aws:logs:us-west-1:999999999999:log-group:quarkus-ecs-example/example-log",
				"arn:aws:logs:us-west-1:999999999999:log-group:quarkus-ecs-example/example-log:*"
			],
			"Effect": "Allow"
		}
	]
}

```

#### Cluster
Clusters are a loose grouping of services. One is typically enough.

`aws ecs create-cluster --cluster-name quarkus-ecs-example-cluster`

Create a new security group for the task and related ECS service. Allow the ALB to connect to the service instance on port 5000.

#### Task VPC
```
aws ec2 create-security-group --description "Quarkus ECS Example Network Rules" --vpc-id vpc-09965b6122d79cb4d --group-name quarkus-ecs-example-ecs-quarkus

aws ec2 create-tags --tags Key=Name,Value=quarkus-ecs-example-ecs-quarkus --resources sg-0523d7656f12bbb54

aws ec2 authorize-security-group-ingress  --group-id sg-0523d7656f12bbb54 --protocol tcp --port 5000 --source-group sg-0b8fe3e5f1b7c8876 
```

#### ALB

Add a target, rule, and certificate for the service to the ALB. Optinally enable sticky sessions.
```
aws elbv2 create-target-group --name qa-quarkus-ecs-example --protocol HTTP --port 80 --target-type ip --vpc-id vpc-09965b6122d79cb4d --health-check-path /health/ready 

aws elbv2 modify-target-group-attributes --target-group-arn arn:aws:elasticloadbalancing:us-west-1:999999999999:targetgroup/qa-quarkus-ecs-example/0c2469b847883e7e --attributes  Key=stickiness.enabled,Value=true Key=stickiness.lb_cookie.duration_seconds,Value=86400
 
aws elbv2 create-rule --listener-arn arn:aws:elasticloadbalancing:us-west-1:999999999999:listener/app/quarkus-ecs-example/8649d45ac4b2b99b/f39d2d2fb3e88668 --conditions  Field=host-header,HostHeaderConfig="{Values=["qa-quarkus-ecs-example.example.com"]}" --priority 1 --actions Order=1,Type=authenticate-oidc,AuthenticateOidcConfig="{Issuer=https://example.okta.com,AuthorizationEndpoint=https://example.okta.com/oauth2/v1/authorize,TokenEndpoint=https://example.okta.com/oauth2/v1/token,UserInfoEndpoint=https://example.okta.com/oauth2/v1/userinfo,ClientId=XXXXXXXXXXXXX,ClientSecret=XXXXXXXXXXXXXXX,Scope=openid profile groups}"  Order=2,Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-west-1:999999999999:targetgroup/qa-quarkus-ecs-example/0c2469b847883e7e

aws acm request-certificate --domain-name qa-quarkus-ecs-example.example.com

aws elbv2 add-listener-certificates --listener-arn arn:aws:elasticloadbalancing:us-west-1:999999999999:listener/app/quarkus-ecs-example/8649d45ac4b2b99b/f39d2d2fb3e88668 --certificates CertificateArn=arn:aws:acm:us-west-1:999999999999:certificate/2670946f-8aed-4ea0-873f-40f837545d76
```

Create a log for the ECS task
`aws logs create-log-group --log-group-name /ecs/qa-quarkus-ecs-example-task`

Next create the task. The precise JSON format for creating the task is difficult to identify because the JSON view of the task in the console and what the describe command returns is incompatible with the JSON format the CLI accepts. I found the best way to generate the task JSON was to create the task in the UI, run the describe task, and then manually edit the JSON as needed.

Here are the highlights of the UI configuration:

* Fargate task
* Name - quarkus-ecs-example 
* Task Role set to ecs-task-quarkus-ecs-example-service-role
* Memory 2GB and CPU .5 CPU
* Added container image (ECR tag URL above)
	* Added port mapping 5000

Then 
`aws ecs describe-task-definition --task-definition quarkus-ecs-example-task:1 > qa-quarkus-ecs-example-task.json` and delete unallowed keys.

The family value is what is displayed in the ECS admin console.

Create the task definition:
`aws ecs register-task-definition --cli-input-json file://qa-quarkus-ecs-example-task.json`

qa-quarkus-ecs-example-task.json:

```
{

	"containerDefinitions": [
		{
			"name": "quarkus-ecs-example",
			"image": "999999999999.dkr.ecr.us-west-1.amazonaws.com/quarkus-ecs-example:latest",
			"cpu": 0,
			"portMappings": [
				{
					"containerPort": 5000,
					"hostPort": 5000,
					"protocol": "tcp"
				}
			],
			"essential": true,
			"environment": [
				{
					"name": "QUARKUS_PROFILE",
					"value": "qa"
				}
			],
			"mountPoints": [],
			"volumesFrom": [],
			"logConfiguration": {
				"logDriver": "awslogs",
				"options": {
					"awslogs-group": "/ecs/qa-quarkus-ecs-example-task",
					"awslogs-region": "us-west-1",
					"awslogs-stream-prefix": "ecs"
				}
			}
		}
	],
	"family": "qa-quarkus-ecs-example-task",
	"taskRoleArn": "arn:aws:iam::999999999999:role/service-role/ecs-task-quarkus-ecs-example-service-role",
	"executionRoleArn": "arn:aws:iam::999999999999:role/ecsTaskExecutionRole",
	"networkMode": "awsvpc",
	"volumes": [],
	
	"placementConstraints": [],
	"requiresCompatibilities": [
		"FARGATE"
	],
	"cpu": "512",
	"memory": "2048"
}

```

Create the service. Note that if  assignPublicIp is set to DISABLED ECS can't connect to the instance so it is required. The VPC service security group only allows traffic from the ALB on port 5000 so the assignment of a public IP should be acceptable. 

Optionally setup autoscaling.

```
aws ecs create-service --cluster quarkus-ecs-example-cluster --service-name qa-quarkus-ecs-example-service --task-definition qa-quarkus-ecs-example-task:1 --desired-count 1 --launch-type "FARGATE" --network-configuration "awsvpcConfiguration={subnets=[subnet-064aeec2a4f4c7618,subnet-06219c0dd5c1667f3],securityGroups=[sg-0523d7656f12bbb54],assignPublicIp=ENABLED}" --health-check-grace-period-seconds 15 --load-balancers targetGroupArn=arn:aws:elasticloadbalancing:us-west-1:999999999999:targetgroup/qa-quarkus-ecs-example/0c2469b847883e7e,containerName=quarkus-ecs-example,containerPort=5000

aws application-autoscaling register-scalable-target --service-namespace ecs --scalable-dimension ecs:service:DesiredCount --resource-id service/quarkus-ecs-example-cluster/qa-quarkus-ecs-example-service --min-capacity 1 --max-capacity 3

aws application-autoscaling put-scaling-policy --service-namespace ecs --scalable-dimension ecs:service:DesiredCount --resource-id service/quarkus-ecs-example-cluster/qa-quarkus-ecs-example-service --policy-name mem75-target-tracking-scaling-policy --policy-type TargetTrackingScaling --target-tracking-scaling-policy-configuration file://scaling-policy.json
```
scaling-policy.json:
```
{
     "TargetValue": 75.0,
     "PredefinedMetricSpecification": {
         "PredefinedMetricType": "ECSServiceAverageMemoryUtilization"
     },
     "ScaleOutCooldown": 60,
    "ScaleInCooldown": 60
}

```

Finally add a Route 53 DNS entry for the subdomain pointed at the ALB. This task can easily be done in the UI as well.

`aws route53 change-resource-record-sets --hosted-zone-id XXXXXXXXXXXX --change-batch file://route53-qa-quarkus-ecs-example.json` 


route53-qa-quarkus-ecs-example.json:
```
{
  "Comment": "Quarkus ECS Example Root Domain Alias",
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
            "AliasTarget": {
                "HostedZoneId": "XXXXXXXXXXXX",
                "EvaluateTargetHealth": false,
                "DNSName": "dualstack.quarkus-ecs-example-000000000.us-west-1.elb.amazonaws.com."
            },
            "Type": "A",
            "Name": "qa-quarkus-ecs-example.example.com."
        }
    }
  ]
}
```

To restart the service from the CLI issue the following command to force a deployment:

`aws ecs update-service --force-new-deployment --service qa-quarkus-ecs-example-service --cluster qa-quarkus-ecs-example-cluster`
