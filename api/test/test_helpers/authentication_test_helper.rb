# frozen_string_literal: true

# Signs a request in the way the app actually does: a real Session row, plus the
# signed cookie carrying only its opaque token.
module AuthenticationTestHelper
  def sign_in_as(user)
    session = user.sessions.create!
    cookies[Authentication::COOKIE] = signed_cookie_value(Authentication::COOKIE, session.token)
    session
  end

  def sign_out!
    cookies.delete(Authentication::COOKIE)
  end

  def create_user(role: nil, **attributes)
    User.create!(
      hca_id: "hca_#{SecureRandom.hex(6)}",
      email: "#{SecureRandom.hex(4)}@example.com",
      name: "Test User",
      roles: [ "user", role&.to_s ].compact,
      **attributes
    )
  end

  def create_project(user, **attributes)
    user.projects.create!(
      { name: "Test Project", repo_link: "https://github.com/test/repo" }.merge(attributes)
    )
  end

  private

  # Builds the value Rails itself would write, using the app's real key
  # generator, so the controller's `cookies.signed` read succeeds.
  def signed_cookie_value(name, value)
    request = ActionDispatch::Request.new(Rails.application.env_config.dup)
    jar = ActionDispatch::Cookies::CookieJar.build(request, {})
    jar.signed[name] = value
    jar[name]
  end
end
