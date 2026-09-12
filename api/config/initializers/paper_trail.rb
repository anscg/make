# frozen_string_literal: true

# `object` and `object_changes` are jsonb columns, so store them as JSON rather
# than YAML — it keeps the trail queryable from the console and from SQL.
PaperTrail.config.enabled = true
PaperTrail.serializer = PaperTrail::Serializers::JSON
PaperTrail.config.has_paper_trail_defaults = { versions: { name: :versions } }
