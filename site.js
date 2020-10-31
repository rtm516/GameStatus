const express = require('express')
const Gamedig = require('gamedig')
const fs = require('fs')
const app = express()

const port = 3000
const ip = '127.0.0.1'

let lastQueryTime = 0
const queryCooldown = 60 * 1000 // Allow a refresh every 60s
let queryData = {}

if (!fs.existsSync('servers.json')) {
  fs.copyFileSync('servers.example.json', 'servers.json')
}

const servers = JSON.parse(fs.readFileSync('servers.json'))

function queryServer (serverID) {
  return new Promise((resolve, reject) => {
    Gamedig.query(Object.assign({ socketTimeout: 200, attemptTimeout: 500 }, servers[serverID]))
      .then(state => {
        const data = {}
        data[serverID] = state
        resolve(data)
      })
      .catch(error => {
        console.log(error)
        const data = {}
        data[serverID] = error
        resolve(data)
      })
  })
}

function queryServers () {
  const queries = []
  Object.keys(servers).forEach(serverID => {
    queries.push(queryServer(serverID))
  })

  return Promise.all(queries)
}

app.get('/', (req, res) => {
  if (Date.now() - lastQueryTime >= queryCooldown) {
    queryServers()
      .then(results => {
        let finalResults = {}
        results.forEach(result => {
          finalResults = Object.assign(finalResults, result)
        })

        queryData = finalResults
        lastQueryTime = Date.now()

        res.json({
          info: {
            updated: true,
            lastUpdate: lastQueryTime
          },
          data: queryData
        })
      })
  } else {
    res.json({
      info: {
        updated: false,
        lastUpdate: lastQueryTime
      },
      data: queryData
    })
  }
})

app.listen(port, ip, () => {
  console.log(`GameStatus listening at http://${ip}:${port}`)
})
