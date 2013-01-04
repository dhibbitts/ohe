/*globals angular */

(function () {
    angular.module('channels', ['messages', 'users', 'ui', 'channelState', 'utils']).config(function ($routeProvider) {
        $routeProvider.when('/', {
            controller: 'ChannelListCtrl',
            templateUrl: '/static/templates/channel-list.html',
            selectedNav: 'inbox'
        }).when('/channel/:channel_id', {
            template: '<channel-detail></channel-detail>'
        });
    }).directive('channelDetail', function ($timeout) {
        return {
            restrict: 'E',
            controller: 'ChannelDetailCtrl',
            templateUrl: '/static/templates/channel-detail.html'
        };
    }).factory('Channel', function ($q, $rootScope, $http, User, Message) {
        var Channel = function (data) {
            if (data) {
                angular.extend(this, data);
                this.creator = new User(data.creator);
            }

            this.subscribers = [];
            this._subscribers_loaded = false;
            this.messages = [];
            this.recent_message = undefined;
            this._recent_message_loaded = false;
        };

        Channel.prototype.detail_url = function () {
            return '/channel/' + this.id;
        };

        Channel.prototype.get_subscribers = function (include_viewer, recent_message) {
            var subscribers;
            if (include_viewer) {
                subscribers = this.subscribers;
            } else {
                subscribers = _.reject(this.subscribers, function (sub) {
                    return sub.id === $rootScope.user_id;
                });
            }

            // if recent_message is supplied, have that user name at the beginning of the list
            if (recent_message && recent_message.user.id !== $rootScope.user_id) {
                subscribers = _.reject(subscribers, function (sub) {
                    return sub.id === recent_message.user.id;
                });
                subscribers.unshift({'name': recent_message.user.name});
            }
            return _.pluck(subscribers, 'name');
        };

        return Channel;
    }).controller('ChannelListCtrl', function ($scope, $location, Channel, Message, channelState, utils) {
        $scope.has_more_channels = true;
        $scope.channel_fetch_size = 10;

        channelState.query_channels($scope.channel_fetch_size, false).then(function () {
            $scope.$watch('channel_list', function (newVal, oldVal) {
                if (newVal !== oldVal) {
                    utils.title_bar_notification();
                }
            }, true);
        });

        $scope.selectedUsers = [];
        $scope.message = "";

        $scope.createUser = function () {
            Message.auto_create(_.pluck($scope.selectedUsers, 'id'), $scope.message).then(function (channel_id) {
                if (channel_id) {
                    $location.path('/channel/' + channel_id);
                }
            });
        };

        $scope.loadOlderChannels = function () {
            channelState.query_channels($scope.channel_fetch_size, true).then(function (channels) {
                if (channels.length < $scope.channel_fetch_size) {
                    $scope.has_more_channels = false;
                }
            });
        };

    }).controller('ChannelDetailCtrl', function ($scope, $element, $timeout, channelState, $routeParams) {
        channelState.get_channel($routeParams.channel_id).then(function (channel) {
            $scope.channel = channel;
            // messages are also loaded at this point
            $scope.$broadcast('channel_loaded');
        });
    });
})();
