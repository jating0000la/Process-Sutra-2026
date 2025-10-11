# Hostinger Database Migration SQL
# Run these commands in your Hostinger MySQL database

# Create database (if not already created through Hostinger panel)
# CREATE DATABASE processsutra_db;
# USE processsutra_db;

# Organizations table
CREATE TABLE organizations (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

# Users table
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    firebase_uid VARCHAR(128) UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255),
    photo_url VARCHAR(500),
    organization_id VARCHAR(36) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP NULL,
    password_changed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

# Flows table
CREATE TABLE flows (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    organization_id VARCHAR(36) NOT NULL,
    created_by VARCHAR(36) NOT NULL,
    flow_data JSON,
    is_active BOOLEAN DEFAULT true,
    version INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

# Form submissions table
CREATE TABLE form_submissions (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    flow_id VARCHAR(36) NOT NULL,
    organization_id VARCHAR(36) NOT NULL,
    submission_data JSON NOT NULL,
    submitted_by VARCHAR(36),
    status VARCHAR(50) DEFAULT 'pending',
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (flow_id) REFERENCES flows(id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL
);

# Password change history table
CREATE TABLE password_change_history (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

# Notifications table
CREATE TABLE notifications (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL,
    organization_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

# API Keys table
CREATE TABLE api_keys (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    organization_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    `key` VARCHAR(128) NOT NULL UNIQUE,
    secret VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    permissions JSON,
    last_used_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

# Webhooks table
CREATE TABLE webhooks (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    organization_id VARCHAR(36) NOT NULL,
    flow_id VARCHAR(36),
    url VARCHAR(500) NOT NULL,
    method VARCHAR(10) DEFAULT 'POST',
    headers JSON,
    is_active BOOLEAN DEFAULT true,
    events JSON,
    secret VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (flow_id) REFERENCES flows(id) ON DELETE CASCADE
);

# Sessions table (for express-session with MySQL)
CREATE TABLE sessions (
    sid VARCHAR(128) PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP NOT NULL,
    INDEX sessions_expire (expire)
);

# Insert default organization
INSERT INTO organizations (id, name, description) 
VALUES ('default-org-id', 'Default Organization', 'Default organization for ProcessSutra');

# Insert admin user (update with your actual Firebase UID and email)
INSERT INTO users (id, firebase_uid, email, display_name, organization_id, role) 
VALUES ('admin-user-id', 'your-firebase-uid-here', 'admin@processsutra.com', 'Admin User', 'default-org-id', 'admin');

# Create indexes for better performance
CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_flows_organization_id ON flows(organization_id);
CREATE INDEX idx_flows_created_by ON flows(created_by);
CREATE INDEX idx_form_submissions_flow_id ON form_submissions(flow_id);
CREATE INDEX idx_form_submissions_organization_id ON form_submissions(organization_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_organization_id ON notifications(organization_id);
CREATE INDEX idx_api_keys_organization_id ON api_keys(organization_id);
CREATE INDEX idx_webhooks_organization_id ON webhooks(organization_id);
CREATE INDEX idx_webhooks_flow_id ON webhooks(flow_id);