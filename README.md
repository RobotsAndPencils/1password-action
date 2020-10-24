![build-test](https://github.com/interstateone/1password-action/workflows/build-test/badge.svg)

# 1Password GitHub Action

Import logins, passwords and documents from your 1Password vaults to use in your GitHub Action workflows.

```yaml
name: Import Secrets
uses: interstateone/1password-action@v1
id: secrets
with:
  device-id: ${{ secrets.OP_DEVICE_ID }}
  sign-in-address: ${{ secrets.OP_SIGN_IN_ADDRESS }}
  email-address: ${{ secrets.OP_EMAIL_ADDRESS }}
  secret-key: ${{ secrets.OP_SECRET_KEY }}
  master-password: ${{ secrets.OP_MASTER_PASSWORD }}
  items: |
    Client A > App Store Connect
    Client A > Certificate | p12
    Client A > Provisioning Profile
```

The imported items can then be used elsewhere in your workflow.

```yaml
- name: Build
  env:
    FASTLANE_USER: ${{ steps.secrets.outputs.app_store_connect_username }}
    FASTLANE_PASSWORD: ${{ steps.secrets.outputs.app_store_connect_password }}
    CERT_FILENAME: ${{ steps.secrets.outputs.p12_filename }}
    PROFILE_FILENAME: ${{ steps.secrets.outputs.provisioning_profile_filename }}
  run: fastlane ios build
```

## Inputs

**Device ID:** Generate a device ID with `head -c 16 /dev/urandom | base32 | tr -d = | tr '[:upper:]' '[:lower:]'`. This should be stable across multiple workflow runs. If you're using GitHub-hosted runners you can set this as a secret, and if you're using self-hosted runners you could set it as an env var on the runner.

**Sign-In Address:** The full URL, with subdomain, where you sign in to 1Password.

**Email Address:** The email address of the user you'll sign in with.

**Secret Key:** The secret key of the user you'll sign in with. Especially if you're using GitHub-hosted runners, this will be a "fresh" sign in, so the action needs your secret key.

**Master Password:** The master password of the user you'll sign in with.

**Items:** A string that describes the vault and item name to import, and an optional output name to rename it to. This must be written in the format `VAULT > ITEM | OUTPUT_NAME`. If the vault or item names contain `>` or `|` characters, you can surround the name in quotes, like `"< Vault A >" > Neopets`.

## Outputs

Login items will output both the username and password, and password items will output the password. The output variable's name will be the item's name with spaces and `.` replaced with `_`, non-alphanumeric characters removed, and lowercased. For example, an item named `Google Firebase 2020` would be available as the `google_firebase_2020` output variable.

Documents will be saved as files with the same filename as in 1Password. Their filename will be set as an output variable following the same rules as login and password items. For example, a document with the filename `Apple Distribution.p12` will be saved as a file with the same name, and the filename will be available as the output variable `apple_distribution_p12`.

In all cases, you can provide your own output name which will be used in place of the item name from 1Password, and normalized.

---

## Development

Install the dependencies

```bash
$ npm install
```

Build the typescript and package it for distribution

```bash
$ npm run build && npm run package
```

Run the tests :heavy_check_mark:

```bash
$ npm test

 PASS  ./index.test.js
  ✓ throws invalid number (3ms)
  ✓ wait 500 ms (504ms)
  ✓ test runs (95ms)

...
```

## Publish to a distribution branch

```bash
$ npm run package
$ git add dist
$ git commit -a -m "Made some changes"
$ git push origin releases/v1
```

See the [versioning documentation](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md)
