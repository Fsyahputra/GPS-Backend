#!/bin/bash

NODE1="mongod --replSet rs0 --port 27017 --dbpath $HOME/mongodb-replset/node1 --bind_ip localhost --fork --logpath $HOME/mongodb-replset/node1/mongod.log"
NODE2="mongod --replSet rs0 --port 27018 --dbpath $HOME/mongodb-replset/node2 --bind_ip localhost --fork --logpath $HOME/mongodb-replset/node2/mongod.log"
NODE3="mongod --replSet rs0 --port 27019 --dbpath $HOME/mongodb-replset/node3 --bind_ip localhost --fork --logpath $HOME/mongodb-replset/node3/mongod.log"

start() {
    echo "Starting MongoDB replica set nodes..."
    eval $NODE1
    eval $NODE2
    eval $NODE3
    echo "Started."
}

stop() {
    echo "Stopping MongoDB replica set nodes..."
    mongod --shutdown --dbpath $HOME/mongodb-replset/node1
    mongod --shutdown --dbpath $HOME/mongodb-replset/node2
    mongod --shutdown --dbpath $HOME/mongodb-replset/node3
    echo "Stopped."
}

case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        stop
        sleep 2
        start
        ;;
    *)
        echo "Usage: $0 {start|stop|restart}"
        exit 1
        ;;
esac

# rs.initiate({
#   _id: "rs0",
#   members: [
#     { _id: 0, host: "localhost:27017" },
#     { _id: 1, host: "localhost:27018" },
#     { _id: 2, host: "localhost:27019" }
#   ]
# })

