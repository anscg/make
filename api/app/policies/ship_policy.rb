# frozen_string_literal: true

class ShipPolicy < ApplicationPolicy
  def index? = staff?
  def show? = staff? || owner? || assigned_reviewer?
  def create? = admin? || owner?

  # Nobody decides their own submission, whatever roles they hold — see
  # `Ship#reviewer_is_not_the_submitter`, which is the guarantee; this only
  # keeps the decide form out of the page instead of letting it 422 on submit.
  #
  # Past that: only a decision that has not been made yet is up for grabs;
  # changing a settled one is an admin action, so it leaves a trail on a known
  # person.
  def update?
    return false if owner?
    return admin? unless record.pending?

    staff?
  end

  def destroy? = admin?

  private

  def owner? = user.present? && record.project.user == user
  def assigned_reviewer? = user.present? && record.reviewer == user

  class Scope < ApplicationPolicy::Scope
    def resolve
      return scope.all if user&.staff?
      return scope.none if user.blank?

      scope.for_user(user)
    end
  end
end
