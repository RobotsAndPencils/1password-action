To run locally. 

1. Install Docker Desktop https://www.docker.com/products/docker-desktop
2. Install ACT - https://github.com/nektos/act
3. RUN: act -P ubuntu-latest=nektos/act-environments-ubuntu:18.04 -j test --secret-file actiontest/.secrets --env-file actiontest/.environment

Couple of things:

- need to use the `ubuntu-latest=nektos/act-environments-ubuntu:18.04` docker image which is 18 GB!
- `test` - the name of your job from the `.github/workflows/test.yml` file
- `--secret-file actiontest/.secrets` is a list of secrets that the docker image uses in replacement of github secrets. Set these locally and do not check in
- `--env-file actiontest/.environment` this simply adds in a `ACT=true`. This can be removed once https://github.com/nektos/act/pull/417 is released. Act v > 0.2.17