# frozen_string_literal: true

class ProjectPolicy < ApplicationPolicy
  def index? = user.present?

  def show?
    return admin? if record.discarded?

    staff? || owner? || !record.is_unlisted
  end

  def create? = user.present?

  # A project stops being editable by its owner once it is in the queue: the
  # reviewer is looking at the frozen copy, but letting the source drift mid
  # review is how you end up reviewing something nobody submitted.
  def update?
    return admin? if record.discarded?

    admin? || (owner? && !record.ships.pending.exists?)
  end

  def destroy?
    return false if record.discarded?

    admin? || owner?
  end

  # Who may ship it. Whether it is *ready* to ship is `Project#shippable?` — that
  # is a state problem and belongs in a 422 with a reason, not a blanket 403.
  def ship? = admin? || owner?

  class Scope < ApplicationPolicy::Scope
    def resolve
      return scope.all if user&.admin?
      return scope.kept if user&.reviewer?
      return scope.kept.listed if user.blank?

      scope.kept.listed.or(scope.kept.where(user:))
    end
  end
end
