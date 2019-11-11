# Example Quarkus Web Application running on Amazon Web Services (AWS) Elastic Container Service (ECS) Fargate

This example and following guide provides detailed instructions on how to develop, build, and deploy a [Quarkus](https://quarkus.io/) web application on [ECS](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/Welcome.html)

I created this guide to share my experience with setting up ECS via the AWS CLI tool. I prefer to use the CLI over manual configuration through the AWS console for the following reasons:

* reproducibility - It is easy to delete resources, tweak commands for different application environments, and perform configuration management

* AWS console is constantly evolving

* AWS console tasks often perform several actions in the background. Only by using the CLI can one truely understand configuration dependencies and relationships.


## Application Overview
This example is a simple web component and React based application that interacts with a Java [MicroProfile](https://microprofile.io/) resource. [Quarkus](https://quarkus.io/) is used as the Microservice Java runtime to service both web application requests and REST requests. 

[Webpack](https://webpack.js.org/) is used to build and bundle the web assets. The application is based on [Web Components](https://www.webcomponents.org/introduction) and includes [Preact](https://preactjs.com/) for compatability with the vibrant React component ecosystem. [TypeScript](https://www.typescriptlang.org/) is used for enhanced readability and Java-like type checking. 



## Environment

* Operating System - This example was tested with Ubuntu 19.10
* JDK -  [OpenJDK 13](https://jdk.java.net/13/)
* IDE -  [Eclipse IDE](https://www.eclipse.org/downloads/packages/release/2019-09/r/eclipse-ide-enterprise-java-developers)
* Docker - [Install](https://docs.docker.com/install/linux/docker-ce/ubuntu/) 
* NPM
* Yarn
* Apache Maven
* AWS CLI - All configurations were deployed to the AWS us-west-1 region.


##Quarkus Build

### Web Build
Change directories to web and run

`yarn`

Confirm the build is successful.


### Server
From the project root directory run 

`mvn clean package`

to build the project.

Run 

`mvn -Dquarkus.profile=qa compile quarkus:dev`

Access [http://localhost:5000/health/ready](http://localhost:5000/health/ready) to confirm the application is running.

Access [http://localhost:5000/api/example/hello](http://localhost:5000/api/example/hello) to confirm the REST resource is accessible.

Access [http://localhost:5000](http://localhost:5000) to confirm the presentation page is accessible.





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
`aws configure`

AWS Access Key ID [****************XXXX]:
AWS Secret Access Key [****************xxxx]:
Default region name [us-east-1]: us-west-1
Default output format [None]:



