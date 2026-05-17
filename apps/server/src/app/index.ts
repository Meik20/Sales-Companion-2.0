import 'dotenv/config'
import { env } from '../config/env'
import { createServer } from './createServer'

const app = createServer()

app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${env.PORT} (0.0.0.0)`)
})
