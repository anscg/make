# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_09_11_084551) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "ahoy_events", force: :cascade do |t|
    t.string "name"
    t.jsonb "properties"
    t.datetime "time", null: false
    t.bigint "user_id"
    t.bigint "visit_id", null: false
    t.index ["name", "time"], name: "index_ahoy_events_on_name_and_time"
    t.index ["properties"], name: "index_ahoy_events_on_properties", opclass: :jsonb_path_ops, using: :gin
    t.index ["user_id"], name: "index_ahoy_events_on_user_id"
    t.index ["visit_id"], name: "index_ahoy_events_on_visit_id"
  end

  create_table "ahoy_visits", force: :cascade do |t|
    t.string "browser"
    t.string "city"
    t.string "country"
    t.string "device_type"
    t.string "ip"
    t.text "landing_page"
    t.float "latitude"
    t.float "longitude"
    t.string "os"
    t.text "referrer"
    t.string "referring_domain"
    t.string "region"
    t.datetime "started_at", null: false
    t.text "user_agent"
    t.bigint "user_id"
    t.string "utm_campaign"
    t.string "utm_content"
    t.string "utm_medium"
    t.string "utm_source"
    t.string "utm_term"
    t.string "visit_token"
    t.string "visitor_token"
    t.index ["user_id"], name: "index_ahoy_visits_on_user_id"
    t.index ["visit_token"], name: "index_ahoy_visits_on_visit_token", unique: true
    t.index ["visitor_token", "started_at"], name: "index_ahoy_visits_on_visitor_token_and_started_at"
  end

  create_table "projects", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "demo_link"
    t.text "description"
    t.datetime "discarded_at"
    t.boolean "is_unlisted", default: false, null: false
    t.string "name", null: false
    t.string "repo_link"
    t.string "screenshot_url"
    t.string "tags", default: [], null: false, array: true
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["discarded_at"], name: "index_projects_on_discarded_at"
    t.index ["is_unlisted"], name: "index_projects_on_is_unlisted"
    t.index ["tags"], name: "index_projects_on_tags", using: :gin
    t.index ["user_id"], name: "index_projects_on_user_id"
  end

  create_table "sessions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "expires_at", null: false
    t.string "ip_address"
    t.datetime "last_seen_at"
    t.string "token", null: false
    t.datetime "updated_at", null: false
    t.string "user_agent"
    t.bigint "user_id", null: false
    t.index ["expires_at"], name: "index_sessions_on_expires_at"
    t.index ["token"], name: "index_sessions_on_token", unique: true
    t.index ["user_id"], name: "index_sessions_on_user_id"
  end

  create_table "ships", force: :cascade do |t|
    t.integer "approved_seconds"
    t.datetime "created_at", null: false
    t.text "feedback"
    t.string "frozen_demo_link"
    t.text "frozen_description"
    t.text "frozen_hca_data"
    t.string "frozen_name"
    t.string "frozen_repo_link"
    t.string "frozen_screenshot_url"
    t.text "justification"
    t.bigint "project_id", null: false
    t.datetime "reviewed_at"
    t.bigint "reviewer_id"
    t.integer "status", default: 0, null: false
    t.datetime "submitted_at", null: false
    t.datetime "updated_at", null: false
    t.index ["project_id"], name: "index_ships_on_project_id"
    t.index ["project_id"], name: "index_ships_on_project_id_pending", unique: true, where: "(status = 0)"
    t.index ["reviewer_id"], name: "index_ships_on_reviewer_id"
    t.index ["status"], name: "index_ships_on_status"
    t.index ["submitted_at"], name: "index_ships_on_submitted_at"
  end

  create_table "users", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "device_token"
    t.string "email", null: false
    t.text "hca_access_token"
    t.string "hca_id"
    t.string "name"
    t.string "roles", default: ["user"], null: false, array: true
    t.string "slack_id"
    t.datetime "updated_at", null: false
    t.index ["device_token"], name: "index_users_on_device_token", unique: true
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["hca_id"], name: "index_users_on_hca_id", unique: true
    t.index ["roles"], name: "index_users_on_roles", using: :gin
    t.index ["slack_id"], name: "index_users_on_slack_id"
  end

  create_table "versions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "event", null: false
    t.string "ip"
    t.bigint "item_id", null: false
    t.string "item_type", null: false
    t.jsonb "object"
    t.jsonb "object_changes"
    t.text "user_agent"
    t.string "whodunnit"
    t.index ["created_at"], name: "index_versions_on_created_at"
    t.index ["item_type", "item_id", "created_at"], name: "index_versions_on_item_type_and_item_id_and_created_at"
    t.index ["whodunnit"], name: "index_versions_on_whodunnit"
  end

  add_foreign_key "ahoy_events", "ahoy_visits", column: "visit_id"
  add_foreign_key "ahoy_events", "users"
  add_foreign_key "ahoy_visits", "users"
  add_foreign_key "projects", "users"
  add_foreign_key "sessions", "users"
  add_foreign_key "ships", "projects"
  add_foreign_key "ships", "users", column: "reviewer_id"
end
