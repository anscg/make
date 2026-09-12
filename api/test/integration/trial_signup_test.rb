# frozen_string_literal: true

require "test_helper"

class TrialSignupTest < ActionDispatch::IntegrationTest
  # The proxy is what enforces same-origin on writes; Rails only ever sees the
  # forwarded request, so these post directly as the proxy would.
  def join(email)
    post "/api/v1/trial_signups", params: { email: }
  end

  test "joining with an email creates a trial user and signs them in" do
    assert_difference -> { User.count }, 1 do
      join("kid@example.com")
    end

    assert_response :created
    user = User.find_by(email: "kid@example.com")
    assert user.trial?
    assert user.device_token.present?
    assert_equal "/onboarding", response.parsed_body["next_path"]

    get "/api/v1/me"
    assert_response :success
  end

  test "the email is normalised" do
    join("  KID@Example.COM ")
    assert_response :created
    assert User.exists?(email: "kid@example.com")
  end

  test "a malformed email is refused" do
    assert_no_difference -> { User.count } do
      join("not-an-email")
    end
    assert_response :unprocessable_content
    assert_equal "invalid_email", response.parsed_body["error"]
  end

  test "an email already in use is refused and sent to HCA" do
    create_user(email: "taken@example.com")

    assert_no_difference -> { User.count } do
      join("taken@example.com")
    end

    assert_response :conflict
    assert_equal "email_taken", response.parsed_body["error"]
    assert response.parsed_body["hca_sign_in_required"]
  end

  test "joining twice from the same browser updates the account instead of colliding" do
    join("first@example.com")
    assert_response :created

    assert_no_difference -> { User.count } do
      join("second@example.com")
    end
    assert_response :created
    assert_equal "second@example.com", User.trial.sole.email
  end

  # The whole point of the device binding: the session cookie alone must not
  # carry an unverified account to another browser.
  # A second `open_session` is a second browser: it carries whatever cookies we
  # hand it and nothing else, which is the only honest way to test this.
  test "a trial session is refused on a browser without the device cookie" do
    join("kid@example.com")
    stolen = cookies[Authentication::COOKIE]

    other_browser = open_session
    other_browser.cookies[Authentication::COOKIE] = stolen
    other_browser.get "/api/v1/me"

    assert_equal 401, other_browser.response.status
  end

  test "a full user is not pinned to a device" do
    user = create_user(email: "full@example.com")
    sign_in_as(user)
    stolen = cookies[Authentication::COOKIE]

    other_browser = open_session
    other_browser.cookies[Authentication::COOKIE] = stolen
    other_browser.get "/api/v1/me"

    assert_equal 200, other_browser.response.status
  end
end
