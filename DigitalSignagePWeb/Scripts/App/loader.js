(function (window, $) {
    "use strict";

    var $overlay = null;

    function getOverlay() {
        if (!$overlay || !$overlay.length) {
            $overlay = $("#loaderOverlay");
        }
        return $overlay;
    }

    window.Loading = function () {
        getOverlay().css("display", "flex");
    };

    window.StopLoading = function () {
        getOverlay().hide();
    };

})(window, jQuery);