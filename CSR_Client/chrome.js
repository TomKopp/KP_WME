/**
 * Created by oliver on 14.03.15.
 */

chrome.app.runtime.onLaunched.addListener(function () {
	chrome.app.window.create("index.html", {
		bounds: {
			width: 600,
			height: 800
		}
	});
});
