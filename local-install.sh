#!/bin/sh
#
# workstation/server install script - consider using docker
uname -on
[ -s /etc/os-release ] && source /etc/os-release
if [ -n "${ID}" ]; then
    [ -n "${PRETTY_NAME}" ] && echo -e "\e[${ANSI_COLOR}m${PRETTY_NAME}\e[m" || echo "${NAME} ${VERSION}"
fi

# let's prompt for admin credentials now, if necessary
[ -n "$1" ] && TARGET="$1" || TARGET=$PWD
#echo "Install dankdomain folder into ${TARGET} ?"
#echo -n "Enter shift 'Y' to continue: "
#read cont
#[ "${cont}" == "Y" ] || exit 0
sudo -B -v || exit

# let's default group ownership to games
member=`sudo groupmems -g games -l | grep -c nobody`
[ $member -eq 0 ] && sudo groupmems -g games -a nobody
member=`sudo groupmems -g games -l | grep -c $USER`
[ $member -eq 0 ] && sudo groupmems -g games -a $USER

# let's use these tools
if [ -n "`which dnf`" ]; then
    [ -n "`which node`" ] || sudo dnf install nodejs
    [ -n "`which playmus`" ] || sudo dnf install SDL_mixer
else
    [ -n "`which node`" ] || echo "requires Node.js runtime package to run any parts locally"
    [ -n "`which playmus`" ] || echo "install SDL mixer package for local media playing using playmus tool"
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
npm test
npm run play

echo "Enable telnet/23 & https/443 redirect rules on this host ?"
echo -n "Enter shift 'Y' to enable rules: "
read cont

if [ "${cont}" == "Y" ]; then
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

echo "Enable SystemD service to startup on this host ?"
echo -n "Enter shift 'Y' to enable dankdomain-door service: "
read cont

if [ "${cont}" == "Y" ]; then
    sudo -B -v || exit
    sudo cp -v "${TARGET}/etc/dankdomain-door.service" /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable dankdomain-door
    sudo systemctl status dankdomain-door -l
fi

echo -n "Press RETURN for an Apache proxy fronting a NodeJs app example: "
read n

echo
echo ... an Apache configuration example follows:
echo

cat <<-EOD
DOOR uses app: express + ws fronts node-pty
   for client: browser uses xterm and bundle.js

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
    RewriteRule "^/xterm/door/(.*)" wss://localhost:1939/xterm/door/$1 [P,L]

    <Location "/xterm/door/">
        RequestHeader set X-Forwarded-Proto "https"
        ProxyPass "https://localhost:1939/xterm/door/"
        ProxyPassReverse "https://localhost:1939/xterm/door/"
        ProxyPreserveHost On
        Order allow,deny
        Allow from all
        Header edit Location ^https://localhost:1939/xterm/door/ https://robert.hurst-ri.us/xterm/door/
    </Location>

# generate a self-signed key
$ openssl req -newkey rsa:2048 -nodes -keyout key.pem -x509 -days 365 -out cert.pem \
    -subj "/C=US/ST=Rhode Island/L=Providence/O=Dank Domain/OU=Game/CN=localhost"
EOD
exit
