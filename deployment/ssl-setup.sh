#!/bin/bash
# SSL证书申请脚本 - 使用Cloudflare DNS API

set -e

# 配置变量
DOMAIN="game.studinlet.com"
EMAIL="your-email@example.com"  # 请修改为你的邮箱
CLOUDFLARE_API_TOKEN="your-cloudflare-api-token"  # 请修改为你的Cloudflare API Token

echo "========================================="
echo "SSL证书申请脚本 (Cloudflare DNS API)"
echo "域名: $DOMAIN"
echo "========================================="

# 检查是否以root运行
if [ "$EUID" -ne 0 ]; then
    echo "错误: 请使用sudo运行此脚本"
    exit 1
fi

# 安装certbot和cloudflare插件
echo "正在安装certbot和cloudflare插件..."
apt update
apt install -y certbot python3-certbot-dns-cloudflare

# 创建Cloudflare API凭据文件
echo "创建Cloudflare API凭据文件..."
mkdir -p /root/.secrets
cat > /root/.secrets/cloudflare.ini <<EOF
# Cloudflare API token
dns_cloudflare_api_token = $CLOUDFLARE_API_TOKEN
EOF

chmod 600 /root/.secrets/cloudflare.ini

# 申请证书
echo "正在申请SSL证书..."
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
    echo "SSL证书申请成功！"
    echo "证书位置: /etc/letsencrypt/live/$DOMAIN/"
    echo "========================================="

    # 设置自动续期
    echo "配置自动续期..."

    # 创建续期钩子脚本
    cat > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh <<'HOOK'
#!/bin/bash
# 证书更新后重启Nginx
systemctl reload nginx
HOOK

    chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh

    # 测试自动续期
    echo "测试自动续期配置..."
    certbot renew --dry-run

    echo "========================================="
    echo "自动续期配置完成！"
    echo "证书将在过期前自动续期"
    echo "========================================="
else
    echo "错误: SSL证书申请失败"
    exit 1
fi

echo ""
echo "下一步:"
echo "1. 确认证书已成功申请"
echo "2. 配置Nginx (参考 nginx.conf)"
echo "3. 重启Nginx: sudo systemctl restart nginx"
