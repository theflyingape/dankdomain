#!/bin/bash
#
# workstation/server install script - consider using docker
uname -on
[ -s /etc/os-release ] && . /etc/os-release
if [ -n "${ID}" ]; then
    [ -n "${PRETTY_NAME}" ] && echo -e "\e[${ANSI_COLOR}m${PRETTY_NAME}\e[m" || echo "${NAME} ${VERSION}"
fi

# let's prompt for admin credentials now, if necessary
path=`dirname $0`; cd $path || exit 1
[ -n "$1" ] && TARGET="$1" || TARGET=$PWD/game
#echo "Install dankdomain folder into ${TARGET} ?"
#echo -n "Enter shift 'Y' to continue: "
#read cont
#[ "${cont}" == "Y" ] || exit 0
#sudo -B -v || exit

# let's default group ownership to games
member=`groups nobody | grep -c games`
[ $member -eq 0 ] && sudo usermod -aG games nobody
if [ -n "$USER" ]; then
    member=`groups $USER | grep -c games`
    [ $member -eq 0 ] && sudo usermod -aG games $USER
fi

# let's use these tools
if [ -n "`which dnf`" ]; then
    [ -n "`which node`" ] || sudo dnf install nodejs
    [ -n "`which playmus`" ] || sudo dnf install SDL_mixer
else
    [ -n "`which node`" ] || echo "requires Node.js runtime package to run any parts locally"
    [ -n "`which playmus`" ] || echo "install SDL mixer package for local media playing using the playmus example tool"
fi

# this.package install script
echo "Nodejs `node -v`"
echo "NPM `npm -v`"

umask 0002
#[ -d "${TARGET}" ] || sudo mkdir -v "${TARGET}"
#TARGET="${TARGET}/`basename ${PWD}`"
#echo "Installing into ${TARGET}"
#if [ ! -d "${TARGET}" ]; then
#    sudo mkdir -v "${TARGET}"
#    sudo chgrp games "${TARGET}"
#    sudo chmod u+rwx,g+rwxs,o-rwx "${TARGET}"
#fi
#[ -d "${TARGET}/users" ] || mkdir -v "${TARGET}/users"

# copy over
#cp -v package.json "${TARGET}"
#cp -r . -t "${TARGET}"
#find "${TARGET}" -name '*.map' -exec rm -f {} \;
#find "${TARGET}" -name '*.sys' -exec rm -f {} \;
#find "${TARGET}" -name 'tsconfig.*' -exec rm -f {} \;
#rm -rf "${TARGET}/node_modules"
#cp -r node_modules "${TARGET}/"

# initialize the game
cd "${TARGET}"
# generate a self-signed key
if [ ! -f portal/key.pem ]; then
    openssl req -newkey rsa:2048 -nodes -keyout portal/key.pem -x509 -days 365 -out portal/cert.pem \
    -subj "/C=US/ST=Rhode Island/L=Providence/O=Dank Domain/OU=Game/CN=localhost"
fi

npm test && echo "You can run it local without this portal service:" || echo "WTF??!"
echo "npm run play"

echo
echo "Enable telnet/23 & https/443 redirect rules on this host for portal app ?"
echo -n "Enter shift 'Y' to enable rules: "
read -t 10 cont

if [ "$cont" == "Y" ]; then
    sudo -B -v || exit
    if sudo service iptables status ; then
        hole=`sudo iptables -L INPUT -n | grep -c 'dpt:23'`
        if [ $hole -eq 0 ]; then
            sudo iptables -A INPUT -p tcp --syn --dport 23 -m connlimit --connlimit-above 1 -j REJECT
            sudo iptables -A INPUT -p tcp -m state --state NEW -m tcp --dport 23 -j ACCEPT
            sudo service iptables save
        fi
    else
        sudo firewall-cmd --permanent --direct --add-rule ipv4 nat OUTPUT 0 -p tcp -o lo --dport 23 -j REDIRECT --to-ports 1986
        sudo firewall-cmd --permanent --direct --add-rule ipv4 nat OUTPUT 0 -p tcp -o lo --dport 443 -j REDIRECT --to-ports 1939
        sudo firewall-cmd --reload
        sudo firewall-cmd --direct --get-all-rules
    fi
fi

echo
echo "Enable SystemD service to startup on this host ?"
echo -n "Enter shift 'Y' to enable dankdomain-portal service: "
read -t 10 cont

if [ "$cont" == "Y" ]; then
    sudo -B -v || exit
    sudo cp -v "${TARGET}/etc/dankdomain-portal.service" /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable dankdomain-portal
    sudo systemctl status dankdomain-portal -l
fi

echo
echo "Show an Apache proxy fronting a NodeJs app example ?"
echo -n "Enter shift 'Y' to show configuration: "
read -t 10 cont

if [ "$cont" == "Y" ]; then
    cat <<EOD
PORTAL uses app: express + ws fronts node-pty
   for client: browser uses bundle.js (with xterm emulator)

if https / wss is used, SSL Proxy works for me like this:

#
#   Apache proxy to run local Node.js apps
#
    SSLProxyEngine On
    SSLProxyCheckPeerName off
    SSLProxyVerify none
    ProxyRequests Off
    ProxyBadHeader Ignore
    <Proxy *>
        Order deny,allow
        Allow from all
    </Proxy>

    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} WebSocket [NC]
    RewriteRule "^/ddgame/(.*)" wss://localhost:1939/ddgame/$1 [P,L]

    <Location "/ddgame/">
        RequestHeader set X-Forwarded-Proto "https"
        ProxyPass "https://localhost:1939/ddgame/"
        ProxyPassReverse "https://localhost:1939/ddgame/"
        ProxyPreserveHost On
        Order allow,deny
        Allow from all
        Header edit Location ^https://localhost:1939/ddgame/ https://robert.hurst-ri.us/ddgame/
    </Location>
EOD
fi
exit
