module "vpc" {
  source      = "../../modules/vpc"
  environment = "QA"
  vpc_cidr    = "10.10.0.0/16"
  subnet_cidr = "10.10.1.0/24"
}

module "compute" {
  source                = "../../modules/compute"
  environment           = "QA"
  vpc_id                = module.vpc.vpc_id
  subnet_id             = module.vpc.public_subnet_id
  instance_type         = var.instance_type
  bastion_instance_type = var.bastion_instance_type
  key_name              = var.key_name
  use_academy_iam       = var.use_academy_iam
}
