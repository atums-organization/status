# atums/status

a simple status monitoring service built with sveltekit and bun.

## requirements

- [bun](https://bun.sh)
- postgresql

## setup

```sh
bun install
cp .env.example .env
```

edit `.env` with your database credentials and settings.

## development

```sh
bun run dev
```

this starts both the api server and the web frontend.

## production

```sh
bun run build
bun run start
```

## license

bsd-3-clause
