/* Deliberately ES5: this page must work without Next, React, Web Push or storage. */
(function () {
  "use strict";
  var api = "https://api.mocmaria.com/api/v1",
    catalog = null,
    token = null,
    user = null,
    revision = 0;
  var bookingIdentity = null,
    authBusy = false,
    bookingBusy = false;
  function el(id) {
    return document.getElementById(id);
  }
  function tell(message) {
    el("notice").textContent = message;
  }
  function value(form, name) {
    return form.elements.namedItem(name).value.trim();
  }
  function canBook() {
    return (
      user &&
      user.isActive !== false &&
      ((user.permissions || []).indexOf("customer.portal") !== -1 ||
        (user.roles || []).some(function (role) {
          return (
            [
              "THERAPIST",
              "DOCTOR_CONSULTANT",
              "SUPER_ADMIN",
              "ADMIN",
              "BRANCH_MANAGER",
              "RECEPTIONIST",
            ].indexOf(role) !== -1
          );
        }))
    );
  }
  function bookingState() {
    el("send-booking").disabled = !catalog || !canBook() || bookingBusy;
    el("send-booking").textContent = bookingBusy
      ? "Đang gửi…"
      : canBook()
        ? "Gửi yêu cầu đặt lịch"
        : "Đăng nhập để đặt lịch";
  }
  function applyAuth(auth) {
    revision += 1;
    token = auth ? auth.accessToken : null;
    user = auth ? auth.user : null;
    el("session-status").textContent = user
      ? "Đã đăng nhập: " + user.displayName
      : "Bạn chưa đăng nhập.";
    el("logout").hidden = !user;
    el("login").hidden = !!user;
    el("register").hidden = !!user;
    el("request-list").textContent = "";
    el("requests-status").textContent = "";
    bookingState();
  }
  function request(url, method, body, bearer, credentials) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open(method, url, true);
      xhr.timeout = 15000;
      xhr.withCredentials = credentials === true;
      xhr.setRequestHeader("Accept", "application/json");
      if (body !== null) xhr.setRequestHeader("Content-Type", "application/json");
      if (bearer) xhr.setRequestHeader("Authorization", "Bearer " + bearer);
      xhr.onload = function () {
        var result = null;
        try {
          result = xhr.responseText ? JSON.parse(xhr.responseText) : null;
        } catch (error) {
          void error;
        }
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(result);
          return;
        }
        var message = result && result.message;
        var failure = new Error(
          typeof message === "string"
            ? message
            : Array.isArray(message)
              ? message.join(". ")
              : "Chưa thể hoàn tất yêu cầu. Vui lòng thử lại."
        );
        failure.status = xhr.status;
        reject(failure);
      };
      xhr.onerror =
        xhr.ontimeout =
        xhr.onabort =
          function () {
            reject(new Error("Kết nối đang gián đoạn. Bạn hãy thử lại."));
          };
      xhr.send(body === null ? null : JSON.stringify(body));
    });
  }
  function call(path, method, body, bearer) {
    if (!api)
      return Promise.reject(new Error("Chưa kết nối được Mộc. Hãy tải lại danh sách trước."));
    return request(api + path, method, body, bearer, true);
  }
  function refresh() {
    var started = revision;
    return call("/auth/refresh", "POST", null).then(
      function (auth) {
        if (started === revision) applyAuth(auth);
        return auth;
      },
      function (error) {
        if (started === revision && error.status === 401) applyAuth(null);
        throw error;
      }
    );
  }
  function privateCall(path, method, body) {
    var started = revision,
      actor = user && user.id;
    return call(path, method, body, token).catch(function (error) {
      if (error.status !== 401 || started !== revision) throw error;
      return refresh().then(function () {
        if (!user || user.id !== actor)
          throw new Error("Phiên đăng nhập đã thay đổi. Hãy kiểm tra và gửi lại.");
        return call(path, method, body, token);
      });
    });
  }
  function authenticate(form, path, body) {
    if (authBusy) return;
    authBusy = true;
    revision += 1; // A pending bootstrap must not overwrite a new login.
    var started = revision;
    var button = form.querySelector("button");
    button.disabled = true;
    tell("Đang xử lý…");
    call(path, "POST", body)
      .then(function (auth) {
        if (started !== revision) return;
        applyAuth(auth);
        form.reset();
        tell("Đã đăng nhập. Bạn có thể gửi yêu cầu đặt lịch.");
        window.location.hash = "booking";
      })
      .catch(function (error) {
        tell(error.message);
      })
      .then(function () {
        authBusy = false;
        button.disabled = false;
      });
  }
  el("login-form").addEventListener("submit", function (event) {
    event.preventDefault();
    authenticate(this, "/auth/login", {
      identifier: value(this, "identifier"),
      password: this.elements.namedItem("password").value,
    });
  });
  el("register-form").addEventListener("submit", function (event) {
    event.preventDefault();
    var body = {
      displayName: value(this, "displayName"),
      password: this.elements.namedItem("password").value,
    };
    var email = value(this, "email"),
      phone = value(this, "phone");
    if (email) body.email = email;
    if (phone) body.phone = phone;
    if (!email && !phone) {
      tell("Hãy nhập email hoặc số điện thoại.");
      return;
    }
    if (
      body.password.length < 10 ||
      !/[a-z]/.test(body.password) ||
      !/[A-Z]/.test(body.password) ||
      !/[0-9]/.test(body.password)
    ) {
      tell("Mật khẩu cần ít nhất 10 ký tự, có chữ thường, chữ hoa và chữ số.");
      return;
    }
    authenticate(this, "/auth/register", body);
  });
  function option(select, id, label) {
    var item = document.createElement("option");
    item.value = id;
    item.textContent = label;
    select.appendChild(item);
  }
  function services() {
    el("service").textContent = "";
    option(el("service"), "", "Chọn dịch vụ");
    if (!catalog) return;
    var provider = catalog.providers.filter(function (p) {
      return p.id === el("provider").value;
    })[0];
    if (provider)
      provider.services.forEach(function (s) {
        option(el("service"), s.id, s.name);
      });
  }
  el("provider").addEventListener("change", services);
  el("location").addEventListener("change", function () {
    el("address").readOnly = this.value === "AT_BRANCH";
    el("address").value = this.value === "AT_BRANCH" && catalog ? catalog.address : "";
  });
  function loadCatalog() {
    el("reload-catalog").disabled = true;
    el("catalog-status").textContent = "Đang tải danh sách…";
    return request("/api/compat/catalog", "GET", null, null, false)
      .then(function (data) {
        // Bearer tokens are sent only to our API, never to an arbitrary catalog URL.
        if (
          data.apiBase !== "https://api.mocmaria.com/api/v1" &&
          !(
            /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname) &&
            /^http:\/\/(localhost|127\.0\.0\.1):\d+\/api\/v1$/.test(data.apiBase)
          )
        )
          throw new Error("Địa chỉ kết nối không hợp lệ.");
        api = data.apiBase;
        catalog = data;
        el("provider").textContent = "";
        option(el("provider"), "", "Chọn kỹ thuật viên");
        data.providers.forEach(function (p) {
          option(el("provider"), p.id, p.name);
        });
        services();
        if (el("location").value === "AT_BRANCH") el("address").value = data.address;
        el("catalog-status").textContent = data.providers.length
          ? "Chọn kỹ thuật viên và dịch vụ bên dưới."
          : "Chưa có kỹ thuật viên để chọn. Bạn có thể tải lại sau.";
        bookingState();
        return data;
      })
      .catch(function (error) {
        el("catalog-status").textContent = error.message;
        throw error;
      })
      .then(
        function (data) {
          el("reload-catalog").disabled = false;
          return data;
        },
        function (error) {
          el("reload-catalog").disabled = false;
          throw error;
        }
      );
  }
  el("reload-catalog").addEventListener("click", function () {
    loadCatalog()
      .then(function () {
        return refresh();
      })
      .catch(function (error) {
        tell(error.message);
      });
  });
  function uuid() {
    if (!window.crypto || !window.crypto.getRandomValues)
      throw new Error("Trình duyệt chưa hỗ trợ gửi yêu cầu an toàn. Hãy mở bằng Safari.");
    var bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    var hex = Array.prototype.map
      .call(bytes, function (b) {
        return ("0" + b.toString(16)).slice(-2);
      })
      .join("");
    return (
      hex.slice(0, 8) +
      "-" +
      hex.slice(8, 12) +
      "-" +
      hex.slice(12, 16) +
      "-" +
      hex.slice(16, 20) +
      "-" +
      hex.slice(20)
    );
  }
  el("booking-form").addEventListener("submit", function (event) {
    event.preventDefault();
    if (bookingBusy) return;
    if (!canBook()) {
      tell("Hãy đăng nhập bằng tài khoản có quyền đặt lịch.");
      return;
    }
    var form = event.currentTarget;
    try {
      var time = new Date(value(form, "requestedAt") + ":00+07:00");
      if (
        !isFinite(time.getTime()) ||
        time.getTime() < Date.now() + 30 * 60000 ||
        time.getTime() > Date.now() + 60 * 86400000
      )
        throw new Error("Hãy chọn thời gian từ 30 phút tới 60 ngày kể từ hiện tại.");
      var body = {
        providerId: value(form, "providerId"),
        serviceId: value(form, "serviceId"),
        location: value(form, "location"),
        address: value(form, "address"),
        requestedAt: time.toISOString(),
        notes: value(form, "notes"),
      };
      if (!body.providerId || !body.serviceId || body.address.length < 12)
        throw new Error("Hãy chọn đủ KTV, dịch vụ và địa chỉ.");
      var signature = user.id + JSON.stringify(body);
      if (!bookingIdentity || bookingIdentity.signature !== signature)
        bookingIdentity = { signature: signature, key: uuid() };
      body.idempotencyKey = bookingIdentity.key;
      bookingBusy = true;
      bookingState();
      tell("Đang gửi yêu cầu…");
      privateCall("/appointment-inquiries", "POST", body)
        .then(function () {
          tell(
            "Đã gửi yêu cầu. KTV sẽ liên hệ để thống nhất thời gian và chi phí. Đây chưa phải lịch đã xác nhận."
          );
          window.location.hash = "requests";
          loadRequests();
        })
        .catch(function (error) {
          tell(error.message + " Bạn có thể nhấn gửi lại; yêu cầu trùng sẽ không được tạo thêm.");
        })
        .then(function () {
          bookingBusy = false;
          bookingState();
        });
    } catch (error) {
      tell(error.message);
    }
  });
  function loadRequests() {
    if (!user) {
      el("requests-status").textContent = "Hãy đăng nhập để xem yêu cầu của bạn.";
      return;
    }
    var actor = user.id;
    el("requests-status").textContent = "Đang tải…";
    privateCall("/appointment-inquiries", "GET", null)
      .then(function (rows) {
        if (!user || user.id !== actor) return;
        el("request-list").textContent = "";
        var own = rows.filter(function (r) {
          return r.customerId === actor;
        });
        var labels = {
          PENDING: "Chờ KTV phản hồi",
          CONTACTED: "KTV đang trao đổi",
          CONFIRMED: "Đã xác nhận",
          IN_SERVICE: "Đang phục vụ",
          COMPLETED: "Đã hoàn thành",
          DECLINED: "KTV chưa thể nhận",
          CANCELLED: "Đã hủy",
        };
        own.forEach(function (row) {
          var item = document.createElement("div");
          item.className = "request";
          item.textContent =
            row.providerName +
            " · " +
            row.serviceName +
            " · " +
            new Date(row.requestedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) +
            " · " +
            (labels[row.fulfillmentStatus || row.status] || "Đang cập nhật");
          el("request-list").appendChild(item);
        });
        el("requests-status").textContent = own.length
          ? "Đã tải yêu cầu của bạn."
          : "Bạn chưa có yêu cầu đặt lịch.";
      })
      .catch(function (error) {
        if (user && user.id === actor) el("requests-status").textContent = error.message;
      });
  }
  el("load-requests").addEventListener("click", loadRequests);
  el("logout").addEventListener("click", function (event) {
    if (authBusy || bookingBusy) return;
    var button = event.currentTarget;
    button.disabled = true;
    call("/auth/logout", "POST", null)
      .then(function () {
        applyAuth(null);
        tell("Đã đăng xuất.");
      })
      .catch(function (error) {
        tell(error.message);
      })
      .then(function () {
        button.disabled = false;
      });
  });
  var date = new Date(Date.now() + 7 * 3600000 + 31 * 60000).toISOString().slice(0, 16);
  el("requested-at").min = date;
  el("requested-at").value = date;
  loadCatalog().catch(function () {});
  refresh().catch(function (error) {
    if (error.status !== 401 && !user)
      el("session-status").textContent =
        "Chưa kiểm tra được phiên đăng nhập. Bạn có thể thử đăng nhập hoặc tải lại danh sách.";
  });
})();
