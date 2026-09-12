# make

A Hack Club You Ship, We Ship program. Rails API + staff UI, Next.js public site.

```
make/
├── api/        Rails 8 — identity, data, jobs, staff & reviewer UI
├── web/        Next.js 16 — public site, proxies to Rails
├── bin/dev     runs both
└── .env.example
```

## Architecture

The browser only ever talks to the Next.js app. Rails is not publicly
reachable; `web/lib/rails.ts` is the only path to it.

```
browser ──> make.hackclub.com (Vercel / Next)
              ├── public pages          rendered by Next, cached at the CDN
              ├── /auth/*     ──┐
              └── /api/v1/*   ──┴──> Rails (internal)

staff  ──> staff.make.hackclub.com ──> Rails directly (staff & reviewer UI)
```

Because everything the browser touches is same-origin, there is **no CORS and
no cross-site cookie**. Two consequences worth preserving:

- **Rails sets no cookie `Domain`.** The session cookie is host-only, so it
  lands on whichever host served it and is unreachable from any other
  `hackclub.com` subdomain. Do not add a `domain:` option.
- **The proxy sets `X-Forwarded-Host`**, so Rails builds redirect URLs on the
  public host instead of leaking the internal one.

### Sessions

Identity lives in Postgres, not in the cookie. `sessions` rows hold the token,
IP, user agent and expiry; the cookie carries only an opaque token. This is
what makes the console useful:

```ruby
u = User.find_by(email: "kid@example.com")
u.sessions.destroy_all   # kick them
Session.active.count     # who is online
u.add_role!(:reviewer)   # roles are user / reviewer / admin
```

### Projects and ships

A **project** is a thing a kid is making; a **ship** is one submission of that
project for review.

```
User ─< Project ─< Ship >─ User (reviewer)
```

A ship copies the project into its own `frozen_*` columns at submit time. This
is the part worth protecting: a reviewer approves *a specific state* of a
project, and the kid can keep working the moment it is decided. Read the frozen
copy everywhere a reviewer or an audit looks — never the live project.

```ruby
Ship.submit!(project)              # snapshots, then queues
Ship.queue                         # oldest pending first
ship.decide!(status: :approved, reviewer: me, approved_seconds: 5400)
```

The model refuses decisions that cannot be audited later: an approval needs
hours, a return or rejection needs feedback the kid can act on, and either needs
a reviewer on record. A project is locked against edits while it sits in the
queue, and becomes shippable again once a decision lands.

`Ship#frozen_hca_data` holds the submitter's HCA identity as it stood at submit
time, encrypted — grant eligibility is judged against that, not against whatever
the account looks like when someone asks months later.

Staff routes sit behind a role constraint, so `/staff/*` is a 404 rather than a
403 for anyone who isn't staff. Pundit still authorizes inside; the constraint
is the outer layer, not a replacement.

### Audit trail

PaperTrail versions `Ship`, `Project`, and `User`. The review page renders the
trail, and the console answers the awkward questions:

```ruby
ship.versions.last.whodunnit          # the User id that decided it
ship.paper_trail.previous_version     # what it was before
PaperTrail::Version.where(whodunnit: u.id.to_s)   # everything this reviewer did
```

Versions carry `ip` and `user_agent` alongside `whodunnit`, so a grant approval
can be placed as well as attributed. `User` is versioned on `roles`, `email`,
`name` and `slack_id` only — the HCA access token must never reach a version
row, and a test asserts it doesn't.

### Analytics

Ahoy, in our own Postgres. The public site is Next-rendered and CDN-cached, so
a page view never reaches Rails: the browser reports to `/ahoy/*`, which proxies
through like everything else (`web/app/components/Analytics.tsx`).

Two consequences of the proxy worth knowing:

- **Rails would otherwise see the proxy as every visitor.** The proxy forwards
  the address it observed in `X-Forwarded-Client-Ip`, and `ProxyClientIp`
  middleware believes it only when `X-Origin-Secret` checks out — otherwise any
  client could name its own IP. That middleware runs ahead of
  `ActionDispatch::RemoteIp`, so `request.remote_ip` is right everywhere,
  including `sessions.ip_address`.
- **Stored IPs are masked** (`Ahoy.mask_ips`), keeping the network and dropping
  the host.

Bot filtering is on, which is why an Ahoy request with no `User-Agent` is
silently ignored — including from a test that forgets one.

```ruby
Ahoy::Visit.since(7.days.ago).count
Ahoy::Event.named("project_shipped").since(1.month.ago).count
Ahoy::Visit.attributed.group(:utm_source).count
u.ahoy_visits.order(:started_at).first    # where a kid came from
```

Geocoding is off; turning it on needs the `geocoder` gem and fills in
country/region/city.

## Setup

Requires Ruby (see `api/.ruby-version`), Node 22+, and Postgres.

```sh
bin/setup
```

That installs both dependency sets, prepares the database, and creates
`web/.env.local` from the example.

`api/.env.development` needs `HASHID_SALT`, `HACKCLUB_CLIENT_ID`, and
`HACKCLUB_CLIENT_SECRET`. Register this callback in your
[HCA app](https://auth.hackclub.com):

```
http://localhost:3001/auth/hack_club/callback
```

Note the port: the callback goes through Next, not straight to Rails.

## Running

```sh
bin/dev
```

- http://localhost:3001 — public site (Next)
- http://localhost:3000 — staff UI and API (Rails)

## Production

| | |
|---|---|
| `web/` | Vercel. Set `RAILS_URL`, `PUBLIC_HOST`, `ORIGIN_SECRET`. |
| `api/` | Any container host. Build context is `api/`. |

Production also needs Active Record encryption keys — `AR_ENCRYPTION_PRIMARY_KEY`,
`AR_ENCRYPTION_DETERMINISTIC_KEY`, `AR_ENCRYPTION_KEY_DERIVATION_SALT`, from
`bin/rails db:encryption:init`. Development and test derive them from
`secret_key_base` so a fresh clone works from `bin/setup`. Lose them and every
stored HCA token and frozen identity snapshot is unreadable.

Rails refuses requests without a matching `X-Origin-Secret` once
`ORIGIN_SECRET` is set on both sides — the check no-ops when it is blank, which
is why local dev needs no secret. Prefer a Cloudflare Tunnel so the origin has
no public IP at all, then the header is belt-and-braces.

Solid Cache, Queue, and Cable each need their own database:

```
DATABASE_URL  CACHE_DATABASE_URL  QUEUE_DATABASE_URL  CABLE_DATABASE_URL
```

Don't point all four at one database — each runs its own `schema:load` and they
will fight over `schema_migrations`. If your provider gives you only one, switch
`config.solid_queue.connects_to` and `cache.yml`/`cable.yml` to `:primary`.

### Preview deploys

Preview sessions work (same-origin, host-only cookie), but HCA validates
callback URLs against a fixed list, so per-PR hostnames can't complete OAuth.
Use one Vercel Custom Environment with an attached domain and register its
callback. For per-PR previews, gate a dev-only impersonation route on an env
var set in Preview only.
