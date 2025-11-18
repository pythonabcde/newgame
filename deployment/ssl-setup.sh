#!/bin/bash
# SSL Certificate Request Script - Using Cloudflare DNS API

set -e

# Configuration variables
DOMAIN="game.studinlet.com"
EMAIL="your-email@example.com"  # Change to your email address
CLOUDFLARE_API_TOKEN="your-cloudflare-api-token"  # Change to your Cloudflare API Token

echo "========================================="
echo "SSL Certificate Request Script (Cloudflare DNS API)"
echo "Domain: $DOMAIN"
echo "========================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Error: Please run this script with sudo"
    exit 1
fi

# Install certbot and cloudflare plugin
echo "Installing certbot and cloudflare plugin..."
apt update
apt install -y certbot python3-certbot-dns-cloudflare

# Create Cloudflare API credentials file
echo "Creating Cloudflare API credentials file..."
mkdir -p /root/.secrets
cat > /root/.secrets/cloudflare.ini <<EOF
# Cloudflare API token
dns_cloudflare_api_token = $CLOUDFLARE_API_TOKEN
EOF

chmod 600 /root/.secrets/cloudflare.ini

# Request certificate
echo "Requesting SSL certificate..."
certbot certonly \
    --dns-cloudflare \
    --dns-cloudflare-credentials /root/.secrets/cloudflare.ini \
    --dns-cloudflare-propagation-seconds 60 \
    -d $DOMAIN \
    --email $EMAIL \
    --agree-tos \
    --non-interactive

if [ $? -eq 0 ]; then
    echo "========================================="
    echo "SSL Certificate Request Successful!"
    echo "Certificate location: /etc/letsencrypt/live/$DOMAIN/"
    echo "========================================="

    # Set up auto-renewal
    echo "Configuring auto-renewal..."

    # Create renewal hook script
    cat > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh <<'HOOK'
#!/bin/bash
# Reload Nginx after certificate renewal
systemctl reload nginx
HOOK

    chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh

    # Test auto-renewal
    echo "Testing auto-renewal configuration..."
    certbot renew --dry-run

    echo "========================================="
    echo "Auto-renewal configuration complete!"
    echo "Certificate will be automatically renewed before expiration"
    echo "========================================="
else
    echo "Error: SSL certificate request failed"
    exit 1
fi

echo ""
echo "Next steps:"
echo "1. Confirm certificate has been successfully requested"
echo "2. Configure Nginx (refer to nginx.conf)"
echo "3. Restart Nginx: sudo systemctl restart nginx"
