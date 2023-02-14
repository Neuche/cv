const express = require('express')
const morgan = require('morgan')
const mcache = require('memory-cache')

const app = express()

app.use(express.json())
app.use(morgan('common'))

// Expandable pairs
const Pairs = {
  btc: 'BTC-USD',
  eth: 'ETH-USD'
}
const Operatios = {
  buy: 'buy',
  sell: 'sell'
}

const cache = (duration) => {
  return (req, res, next) => {
    const key = '__express__' + req.originalUrl || req.url
    const cachedBody = mcache.get(key)
    if (cachedBody) {
      res.send(cachedBody)
    } else {
      res.sendResponse = res.send
      res.send = (body) => {
        mcache.put(key, body, duration * 1) // milliseconds
        res.sendResponse(body)
      }
      next()
    }
  }
}

// middleware
function checkOperationValue (req, res, next) {
  if (Object.values(Operatios).includes(req.params.operation)) {
    next()
  } else {
    console.error(`${req.params.operation} is not a valid operation`)
    res.status(400).send(`Invalid operation value: ${req.params.operation}`)
  }
}
function checkSymbolValue (req, res, next) {
  if (Object.values(Pairs).includes(req.params.symbol)) {
    next()
  } else {
    console.error(`${req.params.symbol} is not a valid trading pair`)
    res.status(400).send(`Invalid symbol value: ${req.params.symbol}`)
  }
}

app.get('/ticker/:symbol', checkSymbolValue, cache(50), async (req, res) => {
  fetch(`https://api.bittrex.com/v3/markets/${req.params.symbol}/orderbook?depth=1`)
    .then(response => response.json())
    .then(data => {
      res.send(data)
    })
    .catch(error => console.error(error))
})

app.get('/effective-price/:symbol/:operation/:amount/:limit',
  checkSymbolValue, checkOperationValue, cache(50), async (req, res) => {
    const { symbol, operation } = req.params
    let { amount, limit } = req.params

    amount = parseFloat(Math.max(0, amount))
    limit = Math.max(0, parseFloat(limit))

    if (amount === 0) {
      console.error('incorrect amount, should be greater than 0')
      return res.status(400).send('incorrect amount, should be greater than 0')
    }
    if (limit === 0) {
      console.error('incorrect limit, should be greater than 0')
      return res.status(400).send('incorrect limit, should be greater than 0')
    }

    const orderbook = await fetch(`https://api.bittrex.com/v3/markets/${symbol}/orderbook?depth=500`)
      .then(response => response.json())
      .then(data => {
        return data
      })
      .catch(error => {
        console.error(error)
        return res.status(503).send('The bittrex API seems down, try again in a few minutes')
      })

    // Calculate the effective price for the trade based on the market depth
    const orders = operation === 'buy' ? orderbook.ask : orderbook.bid

    let remainingAmount = amount
    let totalCost = 0
    let limitReached = false
    let nextEffectivePrice = 0

    for (let { quantity, rate } of orders) {
      quantity = parseFloat(quantity)
      rate = parseFloat(rate)
      let tradeQuantity = quantity

      nextEffectivePrice = (totalCost + quantity * rate) / (tradeQuantity + (amount - remainingAmount))

      if (operation === 'buy' && limit <= nextEffectivePrice) {
        tradeQuantity = (limit * (amount - remainingAmount) - totalCost) / (rate - limit)
        limitReached = true
      }
      if (operation === 'sell' && limit >= nextEffectivePrice) {
        tradeQuantity = (limit * (amount - remainingAmount) - totalCost) / (rate - limit)
        limitReached = true
      }
      tradeQuantity = Math.min(remainingAmount, tradeQuantity)

      remainingAmount -= tradeQuantity
      totalCost += tradeQuantity * rate
      if (remainingAmount <= 0 || limitReached) {
        break
      }
    }

    const effectivePrice = totalCost / (amount - remainingAmount)

    res.json({ effectivePrice })
  })

app.listen(3000, () => {
  console.log('Server on port 80')
})
