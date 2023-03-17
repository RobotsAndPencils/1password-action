import {parseItemRequestsInput} from '../src/parsing'

test('parses single quoted item', async () => {
  const output = parseItemRequestsInput(
    '"GitHub < Action > Test Vault" > "Test Login"'
  )
  expect(output).toHaveLength(1)
  expect(output[0].vault).toBe('GitHub < Action > Test Vault')
  expect(output[0].name).toBe('Test Login')
  expect(output[0].outputName).toBe('test_login')
})

test('parses single unquoted item', async () => {
  const output = parseItemRequestsInput('GitHub Action Test Vault > Test Login')
  expect(output).toHaveLength(1)
  expect(output[0].vault).toBe('GitHub Action Test Vault')
  expect(output[0].name).toBe('Test Login')
  expect(output[0].outputName).toBe('test_login')
})

test('parses single unquoted, renamed item', async () => {
  const output = parseItemRequestsInput(
    'GitHub Action Test Vault > Test Login | Creds'
  )
  expect(output).toHaveLength(1)
  expect(output[0].vault).toBe('GitHub Action Test Vault')
  expect(output[0].name).toBe('Test Login')
  expect(output[0].outputName).toBe('creds')
})

test('parses multiple unquoted, renamed items', async () => {
  const output =
    parseItemRequestsInput(`GitHub Action Test Vault > Test Login | Creds
  GitHub Action Test Vault > Test Password`)
  expect(output).toHaveLength(2)
  expect(output[0].vault).toBe('GitHub Action Test Vault')
  expect(output[0].name).toBe('Test Login')
  expect(output[0].outputName).toBe('creds')
  expect(output[1].vault).toBe('GitHub Action Test Vault')
  expect(output[1].name).toBe('Test Password')
  expect(output[1].outputName).toBe('test_password')
})

test('parses single unquoted multi word item', async () => {
  const output = parseItemRequestsInput('GitHub Action Test Vault > Test Login Four Words')
  expect(output).toHaveLength(1)
  expect(output[0].vault).toBe('GitHub Action Test Vault')
  expect(output[0].name).toBe('Test Login Four Words')
  expect(output[0].outputName).toBe('test_login_four_words')
})

test('parses single unquoted multi word item separated by periods', async () => {
  const output = parseItemRequestsInput('GitHub Action Test Vault > Test.Login.Four.Words')
  expect(output).toHaveLength(1)
  expect(output[0].vault).toBe('GitHub Action Test Vault')
  expect(output[0].name).toBe('Test.Login.Four.Words')
  expect(output[0].outputName).toBe('test_login_four_words')
})
