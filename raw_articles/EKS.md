Here is the complete, in-depth overview of Amazon EKS (Elastic Kubernetes Service), following your requested format.

---
title: Amazon EKS: The Managed Kubernetes Control Plane
slug: amazon-eks-architecture-deep-dive
tags: [eks, kubernetes, aws, containers, devops]
---

# Amazon EKS: The Managed Kubernetes Control Plane

Amazon Elastic Kubernetes Service (EKS) is a managed Kubernetes service that simplifies running Kubernetes on AWS without needing to install, operate, or maintain your own control plane. It is certified Kubernetes-conformant, meaning existing applications running on upstream Kubernetes are fully compatible with EKS . By offloading the complexity of control plane management to AWS, teams can focus on application development rather than cluster operations.

### The Core Philosophy

Unlike self-managed Kubernetes where you are responsible for the availability and scalability of both control plane and worker nodes, EKS fundamentally changes this equation. AWS manages the Kubernetes control plane across multiple Availability Zones (AZs), automatically detecting and replacing unhealthy control plane nodes while providing automated version upgrades and patching .

---

## Control Plane Architecture

The control plane is the brain of any Kubernetes cluster, responsible for exposing the Kubernetes API, scheduling workloads, and maintaining cluster state. In EKS, this is fully managed by AWS.

### Multi-AZ Deployment for High Availability

EKS runs the Kubernetes control plane across three Availability Zones within an AWS Region. This architecture includes:
- **Minimum two API server instances** distributed across AZs
- **Three etcd instances** spread across three AZs for durability
- **Automatic replacement** of unhealthy control plane instances
- **NAT gateways in each AZ** with API servers and etcd running in private subnets 

This design ensures that a failure in a single Availability Zone does not impact cluster availability. The control plane runs within an EKS-managed VPC that is isolated per cluster—each EKS cluster has its own dedicated VPC and Kubernetes control plane, preventing cross-cluster or cross-account interference .

### Control Plane Components

The EKS-managed control plane includes:
- **kube-apiserver**: Exposes the Kubernetes API, handling all administrative requests
- **kube-scheduler**: Assigns pods to worker nodes based on resource requirements and constraints
- **kube-controller-manager**: Runs core controller loops (nodes, replication, endpoints, etc.)
- **etcd**: Distributed key-value store maintaining all cluster state 

### Provisioned Control Plane (Performance Tiers)

For workloads requiring predictable, high-performance control plane behavior, EKS offers Provisioned Control Plane tiers. Rather than relying on reactive autoscaling (which takes approximately 10 minutes to scale up), Provisioned Control Plane provides three additional tiers (XL, 2XL, and 4XL) that deliver:

- **Higher API request concurrency** — eliminates controller contention
- **Faster pod scheduling rate** — reduces batch job startup time
- **Larger etcd database** — up to 16 GB (double the standard tier)

You can move between tiers with a single API call—no migration, no downtime, and no new cluster required .

### Ultra-Scale Clusters (Up to 100,000 Nodes)

For organizations running massive AI/ML workloads, EKS Ultra-Scale Clusters support up to 100,000 nodes in a single cluster (representing 800,000 NVIDIA GPUs or ~1.6 million AWS Trainium chips). Achieving this scale required architectural innovations:

**etcd Optimizations:**
1. **External consensus** — Offloaded RAFT consensus from etcd to a purpose-built multi-AZ transaction journal
2. **In-memory state** — Moved cluster state from EBS-backed BoltDB to tmpfs (in-memory database)
3. **Partitioned key spaces** — Dedicated etcd instances for nodes, pods, leases, and events

**Results:** Peak read throughput of 7,500 requests per second, peak writes of 8,000-9,000 requests per second, and 3x faster pod readiness .

---

## Data Plane (Compute Options)

The data plane consists of the worker nodes where your containers actually run. EKS provides multiple options with varying levels of control and management.

### 1. EKS Auto Mode (Maximum Abstraction)

EKS Auto Mode represents the most managed compute option, extending AWS management from the control plane into the data plane. It automates cluster infrastructure management for compute, networking, load balancing, DNS, storage, and GPU support—all as built-in components .

**Security enhancements in Auto Mode:**
- **EC2 managed instances** — AWS handles operational control of underlying EC2 instances
- **Minimal container-optimized OS** — Uses Bottlerocket variant, optimized solely for running containers
- **Reduced node role permissions** — Designed with fewer required IAM permissions on the node role
- **AWS-managed components** — Shifts responsibility for health and patching of networking, storage, and compute components to AWS
- **Frequent patching** — AWS is responsible for patching both infrastructure and Auto Mode node AMIs

**Best practice:** Treat Kubernetes nodes as ephemeral compute providers. Auto Mode enforces this by using immutable AMIs that are dynamically replaced rather than updated in-place .

### 2. AWS Fargate (Serverless Containers)

Fargate is a serverless compute engine for containers that eliminates the need to manage underlying EC2 instances. You specify resource requirements, and AWS automatically provisions, scales, and maintains the infrastructure .

**Ideal for:** Teams prioritizing simplicity over control, bursty or unpredictable workloads, and organizations wanting to eliminate node management entirely.

### 3. Managed Node Groups

Managed node groups provide a balance of automation and customization. AWS handles node patching, updates, and scaling, while you retain control over kubelet arguments for advanced CPU/memory management policies .

**Key features:**
- Automatic node replacement on health failures
- Graceful draining during updates and terminations
- Support for custom AMIs (EKS-optimized or custom)
- Integration with EC2 Spot Instances for cost reduction

### 4. Karpenter (Dynamic Node Provisioning)

Karpenter is a flexible, high-performance Kubernetes cluster autoscaler that provisions just-in-time compute resources based on application load changes. Unlike the standard Cluster Autoscaler (which works reactively), Karpenter actively selects optimal instance types and sizes for pending pods .

### 5. Self-Managed Nodes (Maximum Control)

Self-managed nodes give you complete control over EC2 instances in your EKS cluster. You are responsible for node management, scaling, and maintenance—suitable for teams requiring fine-grained control and custom configurations .

### 6. EKS Hybrid Nodes

EKS Hybrid Nodes allow you to use on-premises and edge infrastructure as nodes in your EKS cluster, unifying Kubernetes management across environments and offloading control plane management to AWS .

### Compute Selection Decision Matrix

| **Option** | **Management Level** | **Best For** | **Control** |
|------------|---------------------|--------------|--------------|
| EKS Auto Mode | Full AWS management | Operational simplicity, ephemeral workloads | Low |
| AWS Fargate | Serverless | Bursty workloads, no node management | Low |
| Managed Node Groups | AWS manages nodes | Steady workloads with standard requirements | Medium |
| Karpenter | AWS manages scaling | Dynamic, diverse workloads | Medium |
| Self-Managed | User manages everything | Custom configurations, regulatory needs | High |
| Hybrid Nodes | AWS control plane | On-premises integration | Mixed |

---

## Networking Architecture

EKS integrates deeply with Amazon VPC to provide pod networking that is both secure and scalable.

### VPC CNI (Container Network Interface)

EKS uses the Amazon VPC CNI plugin, which assigns IP addresses to pods directly from your VPC. Each pod receives a native VPC IP address, eliminating the need for overlay networks .

**Advanced features:**
- **IPv6 support** — Pods receive globally routable IPv6 addresses, eliminating private IPv4 address space limitations while maintaining backward compatibility with IPv4 endpoints
- **Prefix assignment** — Karpenter can pre-assign IP prefixes during node launch (rather than reactively through CNI), significantly reducing node readiness time at scale 

### Load Balancing Integration

EKS supports multiple load balancing options:
- **Elastic Load Balancing** — ALB, NLB, and Classic Load Balancer integration
- **AWS Gateway API Controller** — Enables Amazon VPC Lattice for cross-cluster connectivity across multiple accounts and VPCs with standard Kubernetes semantics 

### Network Policies

EKS works with Project Calico to provide fine-grained network policies using the Kubernetes Network Policy API, allowing per-service access control .

---

## Security Architecture

Security in EKS operates at multiple layers, combining IAM, Kubernetes RBAC, and pod-level identity.

### IAM Integration with Kubernetes RBAC

EKS integrates Kubernetes RBAC directly with AWS IAM, allowing you to assign RBAC roles to IAM entities (users, roles, groups) for granular control over Kubernetes API access .

### IRSA (IAM Roles for Service Accounts)

IRSA is the recommended method for granting pods access to AWS services. It replaces long-term credentials with short-lived, identity-based trust .

**How it works:**

1. Create an IAM OIDC identity provider for your EKS cluster
2. Create an IAM role with a trust policy that allows the Kubernetes service account to assume it
3. Annotate the Kubernetes service account with the IAM role ARN
4. Deploy pods using that service account

**The result:** Pods automatically receive temporary AWS credentials via the AWS_WEB_IDENTITY_TOKEN_FILE environment variable, with no hardcoded secrets in manifests .

**Benefits:**
- No long-term credentials stored in pods
- Least-privilege access per workload
- Reusable, versionable IAM configurations
- Clear audit trail (aligned with SOC 2, ISO 27001, HIPAA)

### EKS Pod Identity (Simplified Alternative)

EKS Pod Identity provides a simplified workflow for obtaining IAM credentials, making it easier to use IAM roles across multiple clusters with simplified policy management .

### Compliance Certifications

EKS is certified for numerous compliance programs:
- SOC, PCI, ISO
- FedRAMP-Moderate, IRAP, C5
- K-ISMS, ENS High, OSPAR, HITRUST CSF
- HIPAA eligible 

### Image Signing and Verification

EKS is compatible with container image signature verification, supporting AWS Signer for signing OCI artifacts (images, SBOMs) before deployment, using open-source admission controllers for verification .

---

## Operational Capabilities

### Managed Add-ons

EKS offers a curated set of Kubernetes software (add-ons) that provide operational capabilities:

| **Add-on** | **Purpose** |
|------------|-------------|
| CoreDNS | Cluster DNS capabilities |
| kube-proxy | Service networking within cluster |
| Amazon VPC CNI | Pod networking via VPC integration |
| CSI Drivers | EBS, EFS, and S3 storage integration |
| Observability agents | Integration with AWS monitoring services |

### EKS Capabilities (Fully Managed Services)

EKS Capabilities are fully managed solutions that run off your clusters while maintaining compatibility with Kubernetes workflows .

**Argo CD (GitOps):**
- Fully managed continuous deployment using Git as the source of truth
- Automatically synchronizes desired application state from Git repositories
- Native integration with IAM Identity Center, Secrets Manager, and CodeConnections
- Eliminates networking setup (transit gateways/VPC peering) for multi-cluster management

**AWS Controllers for Kubernetes (ACK):**
- Manage AWS resources using Kubernetes APIs and declarative configurations
- Support for 50+ AWS services (S3, RDS, DynamoDB, Lambda)
- AWS handles controller lifecycle, security patches, and scaling

**Kube Resource Orchestrator (kro):**
- Define custom Kubernetes APIs with simple configuration
- Create prescriptive multi-resource configurations with organizational standards
- Platform teams can provide self-service capabilities with proper guardrails

### Console Integration

EKS provides an integrated console for viewing your entire cluster—a single place to organize, visualize, and troubleshoot Kubernetes applications. Additionally, you can connect any conformant Kubernetes cluster (EKS Anywhere on-premises, self-managed EC2 clusters, other cloud providers) to visualize them in the EKS console .

---

## Scaling Strategies

### Challenge: Reactive Node Scaling

By default, the Cluster Autoscaler works reactively—it adds nodes only when unschedulable pods are detected. But EC2 instance provisioning takes minutes, creating a gap where high-priority workloads sit unscheduled .

### Solution: Over-Provisioning with Pod Priority

The solution combines three Kubernetes features:

1. **Cluster Autoscaler** — Automatically adjusts node count
2. **Pod Priority & Preemption** — High-priority pods can evict low-priority pods
3. **Low-priority placeholder pods** — Occupy spare capacity as a buffer

**The workflow:**
- Deploy low-priority placeholder pods that occupy spare capacity
- When critical workloads arrive, Kubernetes evicts placeholders immediately
- High-priority pods schedule instantly on the available capacity
- Cluster Autoscaler detects the freed capacity is gone and provisions new nodes
- Placeholder pods reschedule on new capacity, maintaining the buffer

**Result:** High-priority workloads start instantly—no waiting for node provisioning .

### Implementation Steps

1. Define PriorityClasses (low and high priority)
2. Deploy low-priority placeholder pods (e.g., with resource requests matching expected workloads)
3. Deploy high-priority workloads with preemption configured
4. Monitor Cluster Autoscaler logs and node usage

---

## Storage Integration

### CSI Drivers

EKS supports Container Storage Interface (CSI) drivers for AWS storage services:
- **Amazon EBS** — Persistent block storage
- **Amazon EFS** — Shared file storage (works across multiple pods)
- **Amazon S3** — Object storage via Mountpoint for S3 CSI driver

### S3 Access Pattern

Many workloads (especially AI/ML training) use S3 as the primary data store. The recommended pattern:
- **Primary data store:** S3 buckets
- **Prefetch buffer:** Absorbs object storage latency
- **Scale example:** Anthropic achieves 5,000 GB/s throughput without a parallel file system for most workloads 

---

## EKS Anywhere (On-Premises)

EKS Anywhere allows you to create and operate Kubernetes clusters on-premises using the same EKS control plane and tooling. Combined with EKS Hybrid Nodes, organizations can maintain consistent Kubernetes management across cloud and edge environments .

---

## Summary Table: Core Components

| **Component** | **Function** | **Management Responsibility** |
|---------------|--------------|------------------------------|
| Control Plane | API server, scheduler, etcd | AWS (fully managed) |
| etcd | Cluster state storage | AWS (with ultra-scale optimizations) |
| Worker Nodes | Run container workloads | User (choice of Auto Mode, Fargate, MNG, etc.) |
| VPC CNI | Pod networking | AWS-managed add-on |
| CoreDNS | Cluster DNS | AWS-managed add-on |
| IAM + RBAC | Authentication/Authorization | Shared (IAM + user RBAC config) |
| IRSA/Pod Identity | Pod-level AWS access | User (IAM role + service account config) |
| EKS Capabilities | Argo CD, ACK, kro | AWS (fully managed, runs off-cluster) |

---

## Conclusion

Amazon EKS fundamentally redefines Kubernetes operations by offloading control plane management to AWS while providing multiple data plane options to match your operational requirements. From fully automated EKS Auto Mode to fine-grained self-managed nodes, from 3-node development clusters to 100,000-node AI training clusters, EKS scales from startup to enterprise.

The architecture combines AWS's multi-AZ reliability with Kubernetes ecosystem compatibility, integrated security (IRSA, IAM, RBAC), and managed capabilities (Argo CD, ACK) that eliminate toil. Whether you're running a handful of microservices or training the next generation of foundation models, EKS provides the managed foundation for container orchestration at any scale.