#!/bin/sh

getDriveFile()
{
    fileId="$1"
    fileName="$2"

    echo "Downloading ${fileName} off Google Drive ... "
    curl -c /tmp/cookie -s -L "https://drive.google.com/uc?export=download&id=${fileId}" > /dev/null
    curl -Lb /tmp/cookie "https://drive.google.com/uc?export=download&confirm=`awk '/download/ {print $NF}' /tmp/cookie`&id=${fileId}" -o ${fileName}
}

[ -f /tmp/images.zip ] || getDriveFile "1jjLPtGf_zld416pxytZfbfCHREZTghkW" "/tmp/images.zip"
unzip -q -d game/portal/static /tmp/images.zip && rm -fv /tmp/images.zip

[ -f /tmp/sounds.zip ] || getDriveFile "1UvqQJbN61VbWVduONXgo1gm9yvGI0Qp8" "/tmp/sounds.zip"
unzip -q -d game/portal/static /tmp/sounds.zip && rm -fv /tmp/sounds.zip
