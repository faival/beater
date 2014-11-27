#!/bin/bash
echo "Starting Mongo"
mongod --dbpath ~/Documents/wemix/data/db
#echo "Starting Wemix on new console"
#echo echo cd ~/Documents/wemix && node ./server.js > startWemix.command; chmod +x startWemix.command; open startWemix.command
