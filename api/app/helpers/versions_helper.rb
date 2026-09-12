# frozen_string_literal: true

module VersionsHelper
  # `whodunnit` is a User id stored as a string. Resolve names in one query
  # rather than one per row.
  def version_actors(versions)
    ids = versions.filter_map { _1.whodunnit.presence }.uniq
    User.where(id: ids).index_by { _1.id.to_s }
  end

  def version_summary(version)
    case version.event
    when "create" then "created"
    when "destroy" then "deleted"
    else
      changed = (version.object_changes || {}).keys - %w[id created_at updated_at]
      changed.any? ? "changed #{changed.to_sentence}" : "updated"
    end
  end
end
