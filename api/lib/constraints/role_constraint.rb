# frozen_string_literal: true

module Constraints
  # Gates whole route trees on a role, so staff paths 404 for everyone else
  # instead of rendering a 403 that confirms they exist. Pundit still runs
  # inside; this is the outer layer, not a replacement for it.
  class RoleConstraint
    def initialize(predicate) = @predicate = predicate

    def matches?(request)
      token = request.cookie_jar.signed[Authentication::COOKIE]
      user = Session.authenticate(token)&.user
      return false if user.blank?

      user.public_send(@predicate)
    end

    def self.staff = new(:staff?)
    def self.admin = new(:admin?)
  end
end
