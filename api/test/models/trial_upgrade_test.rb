# frozen_string_literal: true

require "test_helper"

# What happens when a kid who joined with an email later signs in with HCA.
class TrialUpgradeTest < ActiveSupport::TestCase
  def auth(uid: "hca_123", email: "kid@example.com", name: "Kid")
    OmniAuth::AuthHash.new(
      uid:,
      info: { email:, name: },
      credentials: { token: "tok_live_secret" },
      extra: { raw_info: { slack_id: "U123" } }
    )
  end

  test "signing in with HCA upgrades the trial account this browser holds" do
    trial = User.start_trial!(email: "kid@example.com", device_token: "dev_abc")
    project = create_project(trial)

    assert_no_difference -> { User.count } do
      @user = User.find_or_create_from_omniauth(auth, claiming: trial)
    end

    assert_equal trial.id, @user.id
    assert @user.full?
    assert_equal "hca_123", @user.hca_id
    # The work they did before signing in follows them over.
    assert_includes @user.projects, project
  end

  # The device binding exists to protect an unverified account; once HCA vouches
  # for them it would only pin a real account to one browser.
  test "upgrading clears the device token" do
    trial = User.start_trial!(email: "kid@example.com", device_token: "dev_abc")
    user = User.find_or_create_from_omniauth(auth, claiming: trial)

    assert_nil user.reload.device_token
  end

  # Without the trial lookup this collides on the unique email index and 500s.
  test "a returning kid on a different browser is matched by email, not duplicated" do
    trial = User.start_trial!(email: "kid@example.com", device_token: "dev_abc")

    assert_no_difference -> { User.count } do
      @user = User.find_or_create_from_omniauth(auth, claiming: nil)
    end

    assert_equal trial.id, @user.id
    assert @user.full?
  end

  test "an unrelated HCA account is still created fresh" do
    User.start_trial!(email: "kid@example.com", device_token: "dev_abc")

    assert_difference -> { User.count }, 1 do
      @user = User.find_or_create_from_omniauth(auth(email: "other@example.com", uid: "hca_999"))
    end

    assert @user.full?
    assert_equal "other@example.com", @user.email
  end

  test "a returning full user is matched on hca_id and not duplicated" do
    existing = User.find_or_create_from_omniauth(auth)

    assert_no_difference -> { User.count } do
      @user = User.find_or_create_from_omniauth(auth(name: "Renamed"))
    end

    assert_equal existing.id, @user.id
    assert_equal "Renamed", @user.name
  end

  # A trial session must never be able to claim a full account.
  test "a full user is never claimed by someone else's sign-in" do
    victim = create_user(email: "victim@example.com")

    user = User.find_or_create_from_omniauth(auth(uid: "hca_attacker", email: "attacker@example.com"),
                                             claiming: victim)

    assert_not_equal victim.id, user.id
    assert_equal "hca_attacker", user.hca_id
  end
end
