#!/bin/sh

[ -n "$1" ] && TARGET="$1" || TARGET=/usr/local/games
TARGET="${TARGET}/`basename ${PWD}`"
echo "Installing into ${TARGET}"

# let's prompt for admin credentials now, if necessary
sudo -v || exit

[ -d ${TARGET} ] || sudo mkdir -v ${TARGET}

# let's start with the services
[ -n "`which node`" ] || sudo dnf install nodejs npm
sudo dnf update nodejs npm

# add the transpiler
# npm install typescript@next -g
tsc -v && sudo npm upgrade typescript -g || sudo npm install typescript -g

# this.package install script
sudo npm install

# replace with my tweaks for bold attribute handling (still needs dark/faint)
cp -v ./patch/term.js ./node_modules/term.js/src/

# transpile and test run locally
npm start

# copy build, add it as a network service, and happy hunting
member=`sudo groupmems -g games -l | grep -c nobody`
[ $member -eq 0 ] && sudo groupmems -g games -a nobody

cat > ./build/logins.sh << EOD
#!/bin/sh -l
# drop to PC emulation if remote enquiry fails
exec node ${TARGET}/ttymain
EOD

chmod +x ./build/logins.sh
sudo rsync -a --delete ./build/ ${TARGET}
sudo rsync -a --delete ./node_modules ${TARGET}/
sudo chown -R root.games ${TARGET}
sudo find ${TARGET} -type d -exec chmod u+rwx,g+rwxs,o-rwx {} \;
ls -lh ${TARGET}

# practical, but use at your own risk
[ -n "`which in.telnetd`" ] || sudo dnf install telnet-server

cat > dankdomain << EOD
# default: on
# description: Dank Domain TTY service allows for remote user logins to play
#              Return of Hack & Slash.
service dankdomain
{
        disable = no
	port			= 23
        socket_type             = stream
	type			= UNLISTED
        wait                    = no
        user                    = nobody
	group			= games
        server                  = `which in.telnetd`
	server_args		= -L ${TARGET}/logins.sh
	env			= TERM=pcansi
	cps			= 2 5
        log_on_success          += USERID
        log_on_failure          += USERID
	instances		= 6
	per_source		= 1
}
EOD

sudo mv -v dankdomain /etc/xinetd.d/
sudo systemctl enable xinetd
sudo systemctl restart xinetd

if sudo service iptables status ; then
	hole=`sudo iptables -L INPUT -n | grep -c 'dpt:23'`
	if [ $hole -eq 0 ]; then
		sudo iptables -A INPUT -p tcp -m state --state NEW -m tcp --dport 23 -j ACCEPT
		sudo service iptables save
	fi
fi

sudo cp ${TARGET}/etc/dankdomain.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable dankdomain
sudo systemctl start dankdomain

exit
