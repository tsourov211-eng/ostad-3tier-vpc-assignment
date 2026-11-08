# Problems Encountered and How I Solved Them

During the deployment of this 3-tier application on AWS, I faced several practical challenges. Below is a summary of the issues encountered and how I resolved them:

### 1. HTTP 502 Bad Gateway on API Requests
* **Problem:** Initially, when loading the frontend from the web server, the browser UI rendered fine, but requests to `/api/records` returned a `502 Bad Gateway` error.
* **Cause:** The Node.js API server was starting before the database service was fully up, and Nginx could not establish a connection to the application tier on port 3000.
* **Resolution:** 
  - Verified and confirmed that the **App Security Group** explicitly allows inbound TCP port `3000` with the source restricted to the **Web Security Group**.
  - In the API startup logic (`server.js`), implemented connection retries so the application waits until the MariaDB database responds before listening on port 3000.

### 2. Private Subnet Instances Needing Internet for Installation
* **Problem:** Both the Application and Database EC2 instances are located in private subnets with only private IP addresses (no public IPv4). When launching, they needed to install packages (`nodejs`, `npm`, `mariadb-server`).
* **Cause:** Private subnets cannot directly reach the Internet Gateway.
* **Resolution:** 
  - Deployed a **NAT Gateway** in the public subnet with an Elastic IP (EIP).
  - Associated the private subnets with a custom **Private Route Table** whose default route (`0.0.0.0/0`) targets the NAT Gateway.
  - This enabled outbound-only internet connectivity for package installations while keeping all inbound internet access strictly blocked.

### 3. Database Table Creation and Privilege Isolation
* **Problem:** The Node.js application was failing to write records due to missing tables and permission errors when connecting as a limited database user.
* **Cause:** A least-privilege database user should not have full administrative `DDL` permissions in production, and table creation needed to happen during database initialization.
* **Resolution:**
  - Separated administrative setup from application runtime. The database initialization script creates the `todoapp` database and `records` table with root privileges.
  - Created a dedicated application user `'todoapp'@'10.0.2.%'` limited to the application subnet CIDR with only `SELECT, INSERT, UPDATE, DELETE` permissions on `todoapp.*`.

### 4. Ensuring Application Persists After Reboot
* **Problem:** The assignment required the backend API to automatically resume running if the EC2 instance is rebooted.
* **Cause:** Running Node.js manually or via nohup does not automatically restart the process upon an OS reboot.
* **Resolution:**
  - Created a dedicated **systemd service** (`/etc/systemd/system/todo-api.service`) with `Restart=always` and `WantedBy=multi-user.target`.
  - Enabled the service via `systemctl enable --now todo-api`, ensuring persistent background execution across reboots.
