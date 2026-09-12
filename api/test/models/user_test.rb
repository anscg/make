# frozen_string_literal: true

require "test_helper"

class UserTest < ActiveSupport::TestCase
  test "roles drive the staff predicates" do
    assert_not create_user.staff?
    assert create_user(role: :reviewer).staff?
    assert create_user(role: :admin).staff?
    assert_not create_user(role: :reviewer).admin?
  end

  test "unknown roles are rejected" do
    user = User.new(hca_id: "x", email: "x@example.com", roles: %w[wizard])

    assert_not user.valid?
    assert_match(/unknown roles/, user.errors[:roles].first)
  end

  test "roles can be granted and revoked" do
    user = create_user
    user.add_role!(:reviewer)
    assert user.reload.reviewer?

    user.remove_role!(:reviewer)
    assert_not user.reload.reviewer?
  end

  test "the hca access token round trips and is encrypted at rest" do
    user = create_user(hca_access_token: "tok_live_secret")

    assert_equal "tok_live_secret", user.reload.hca_access_token
    ciphertext = User.connection.select_value("SELECT hca_access_token FROM users WHERE id = #{user.id}")
    assert_no_match(/tok_live_secret/, ciphertext)
  end

  test "sessions are associated and cascade on delete" do
    user = create_user
    user.sessions.create!

    assert_equal 1, user.sessions.count
    assert_difference -> { Session.count }, -1 do
      user.destroy
    end
  end
end
