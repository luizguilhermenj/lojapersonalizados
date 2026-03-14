import 'dotenv/config'
import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { MercadoPagoConfig, Preference } from 'mercadopago'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

const PORT = process.env.PORT || 3000
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || ''

const DATA_FILE = path.join(__dirname, 'data', 'orders.json')

const PRODUCTS = [
  {
    id: 'caneca-classica',
    name: 'Caneca Clássica de Teste',
    description: 'Produto fictício para validar checkout, retorno e webhook.',
    price: 1.0,
    image: '/img-caneca.svg'
  },
  {
    id: 'caneca-premium',
    name: 'Caneca Premium de Teste',
    description: 'Produto fictício premium para testar cenários com outro valor.',
    price: 1.50,
    image: '/img-caneca.svg'
  }
]

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))

function ensureDataFile() {
  const dir = path.dirname(DATA_FILE)

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2))
  }
}

function readOrders() {
  ensureDataFile()
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
}

function writeOrders(orders) {
  ensureDataFile()
  fs.writeFileSync(DATA_FILE, JSON.stringify(orders, null, 2))
}

function createOrder(order) {
  const orders = readOrders()
  orders.push(order)
  writeOrders(orders)
}

app.get('/api/products', (req, res) => {
  res.json(PRODUCTS)
})

app.post('/api/create-preference', async (req, res) => {
  try {
    const { productId, name, email, quantity } = req.body

    const product = PRODUCTS.find(p => p.id === productId)

    if (!product) {
      return res.status(400).json({ error: 'Produto inválido.' })
    }

    const parsedQuantity = Number(quantity) || 1

    const client = new MercadoPagoConfig({
      accessToken: MP_ACCESS_TOKEN
    })

    const preference = new Preference(client)

    const body = {
      items: [
        {
          id: product.id,
          title: product.name,
          description: product.description,
          quantity: parsedQuantity,
          currency_id: 'BRL',
          unit_price: Number(product.price)
        }
      ],
      payer: {
        name,
        email
      },
      back_urls: {
        success: `${BASE_URL}/resultado.html`,
        failure: `${BASE_URL}/resultado.html`,
        pending: `${BASE_URL}/resultado.html`
      }
    }

    console.log('Payload enviado ao Mercado Pago:')
    console.log(JSON.stringify(body, null, 2))

    const response = await preference.create({ body })

    createOrder({
      id: response.id,
      productId,
      name,
      email,
      quantity: parsedQuantity,
      createdAt: new Date().toISOString()
    })

    res.json({
      initPoint: response.init_point,
      sandboxInitPoint: response.sandbox_init_point
    })

  } catch (error) {
    console.error('Erro ao criar checkout:', error)

    res.status(500).json({
      error: 'Não foi possível criar a preferência de pagamento.',
      details: error?.message || 'Erro desconhecido'
    })
  }
})

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    envConfigured: Boolean(MP_ACCESS_TOKEN)
  })
})

app.listen(PORT, () => {
  console.log(`🚀 Loja de teste rodando em ${BASE_URL}`)
})