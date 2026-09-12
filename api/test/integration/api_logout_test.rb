# frozen_string_literal: true

require "test_helper"

class ApiLogoutTest < ActionDispatch::IntegrationTest
  test "signing out destroys the session row, not just the cookie" do
    user = create_user(email: "kid@example.com")
    session = sign_in_as(user)

    assert_difference -> { Session.count }, -1 do
      delete "/api/v1/session"
    end

    assert_response :no_content
    assert_not Session.exists?(session.id)

    get "/api/v1/me"
    assert_response :unauthorized
  end

  test "signing out a trial user works the same way" do
    post "/api/v1/trial_signups", params: { email: "trial@example.com" }
    assert_response :created

    delete "/api/v1/session"
    assert_response :no_content

    get "/api/v1/me"
    assert_response :unauthorized
  end

  test "signing out while signed out is a no-op" do
    assert_nothing_raised { delete "/api/v1/session" }
    assert_response :no_content
  end
end
