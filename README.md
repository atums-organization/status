# atums/status

a simple status monitoring service built with sveltekit and bun.

# view [todo](https://todo.atums.world/share/FWlRpIQz65sU8CDAAsCz694lZkkV0BTX4j5p3vry/auth?view=12)

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

## docker

```sh
docker pull registry.heliopolis.live/atums/status:latest
```

## license

bsd-3-clause
