$(document).ready(function() {
    var accessToken = localStorage.getItem('accessToken');
    var userEmail = null;

    const messageSendLink = document.getElementById('send-message');
    const messageBoxLink = document.getElementById('open-messages');

    function updateMessageLinksVisibility() {
        if (userEmail != null) {
            messageSendLink.style.display = 'block';
            messageBoxLink.style.display = 'block';
        } else {
            messageSendLink.style.display = 'none';
            messageBoxLink.style.display = 'none';
        }
    }

    if (accessToken) {
        $.ajax({
            type: 'GET',
            url: '/api/user/info',
            headers: {
                'Authorization': 'Bearer ' + accessToken
            },
            success: function(response) {
                userEmail = response.email;
                updateMessageLinksVisibility();
            },
            error: function(xhr, status, error) {
                console.error('사용자 정보를 가져오는데 실패했습니다:', status, error);
                updateMessageLinksVisibility();
            }
        });
    } else {
        updateMessageLinksVisibility();
    }

    $('#sendMessageForm').on('submit', function(event) {
        event.preventDefault();

        const receiverEmail = $('#recipientEmail').val();
        const messageContent = $('#messageContent').val();
        const inviteUrl = $('#inviteUrl').val();

        const requestBody = {
            receiverEmail: receiverEmail,
            content: messageContent,
            inviteUrl: inviteUrl
        };

        console.log('Request Body:', requestBody); // 콘솔에 요청 본문 출력

        fetch('/api/messages/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + accessToken
            },
            body: JSON.stringify(requestBody)
        })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(errorData => {
                        Swal.fire({
                            title: '오류',
                            text: errorData.message || '쪽지 전송에 실패했습니다.',
                            icon: 'error',
                            confirmButtonText: '확인'
                        });
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data) {
                    Swal.fire({
                        title: '성공',
                        text: '메시지가 성공적으로 전송되었습니다!',
                        icon: 'success',
                        confirmButtonText: '확인'
                    }).then(() => {
                        $('#sendMessageForm')[0].reset(); // 폼 초기화
                        $('#sendMessageModal').css('display', 'none'); // 모달 닫기
                    });
                } else {
                    Swal.fire({
                        title: '오류',
                        text: '메시지 전송에 실패했습니다.',
                        icon: 'error',
                        confirmButtonText: '확인'
                    });
                }
            })
            .catch(error => console.error('Error:', error));
    });

    function loadMessages(url, messageType) {
        fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + accessToken
            }
        })
            .then(response => response.json())
            .then(data => {
                if (!Array.isArray(data)) {
                    throw new Error("Invalid response format");
                }

                const messageList = $('#messageList');
                messageList.empty();

                data.forEach(message => {
                    const listItem = $('<li></li>').addClass('list-group-item')
                        .text(`보낸 사람: ${message.senderEmail}, 내용: ${message.content}, 보낸 시간: ${new Date(message.createdDate).toLocaleString()}`)
                        .append(
                            $('<input type="hidden">').addClass('message-id').val(message.id),
                            $('<input type="hidden">').addClass('message-box').val(messageType),
                            $('<button></button>')
                                .addClass('btn btn-danger btn-sm')
                                .text('삭제')
                                .css({'border': '2px solid #dc3545'})
                                .on('click', function(event) {
                                    event.stopPropagation();
                                    const parentLi = $(this).closest('li');
                                    const messageId = parentLi.find('.message-id').val();
                                    const messageBox = parentLi.find('.message-box').val();

                                    fetch(`/api/messages/delete?id=${messageId}&box=${messageBox}`, {
                                        method: 'GET',
                                        headers: {
                                            'Authorization': 'Bearer ' + accessToken
                                        }
                                    })
                                        .then(response => {
                                            if (response.ok) {
                                                return response.json();
                                            } else {
                                                throw new Error('Network response was not ok');
                                            }
                                        })
                                        .then(responseData => {
                                            Swal.fire({
                                                title: '삭제 완료',
                                                text: '쪽지가 삭제 되었습니다.',
                                                icon: 'success',
                                                confirmButtonText: '확인'
                                            }).then(() => {
                                                loadMessages(url, messageType);
                                            });
                                        })
                                        .catch(error => {
                                            Swal.fire({
                                                title: '오류',
                                                text: '삭제 요청이 실패했습니다: ' + error,
                                                icon: 'error',
                                                confirmButtonText: '확인'
                                            });
                                        });
                                })
                        )
                        .on('click', function() {
                            const messageId = $(this).find('.message-id').val();
                            const messageBox = $(this).find('.message-box').val();

                            fetch(`/api/messages/${messageBox}/read?id=${messageId}`, {
                                method: 'GET',
                                headers: {
                                    'Authorization': 'Bearer ' + accessToken
                                }
                            })
                                .then(response => response.json())
                                .then(data => {
                                    const messageItem = $('<li></li>').addClass('list-group-item')
                                        .append(
                                            $('<span></span>').text(`보낸 사람: ${data.senderEmail}`).css({'display': 'block', 'margin-top': '10px'}),
                                            $('<hr>'),
                                            $('<span></span>').text(`팀 URL: ${data.inviteUrl}`).css('display', 'block'),
                                            $('<span></span>').text(`팀 소개: ${data.content}`).css('display', 'block'),
                                            $('<button></button>')
                                                .addClass('btn btn-primary btn-sm')
                                                .text('초대')
                                                .css({'border': '2px solid #000000', 'margin-top': '10px'})
                                                .on('click', function(event) {
                                                    window.location.href = `${data.inviteUrl}`;
                                                }),
                                            $('<hr>'),
                                            $('<span></span>').text(`보낸 날짜: ${new Date(data.createdDate).toLocaleString()}`).css('display', 'block'),
                                            $('<hr>'),
                                            $('<button></button>')
                                                .addClass('btn btn-danger btn-sm')
                                                .text('삭제')
                                                .css({'border': '2px solid #dc3545'})
                                                .on('click', function(event) {
                                                    event.stopPropagation();

                                                    fetch(`/api/messages/delete?id=${messageId}&box=${messageBox}`, {
                                                        method: 'GET',
                                                        headers: {
                                                            'Authorization': 'Bearer ' + accessToken
                                                        }
                                                    })
                                                        .then(response => {
                                                            if (response.ok) {
                                                                return response.json();
                                                            } else {
                                                                throw new Error('Network response was not ok');
                                                            }
                                                        })
                                                        .then(responseData => {
                                                            Swal.fire({
                                                                title: '삭제 완료',
                                                                text: '쪽지가 삭제 되었습니다.',
                                                                icon: 'success',
                                                                confirmButtonText: '확인'
                                                            }).then(() => {
                                                                loadMessages(url, messageType);
                                                            });
                                                        })
                                                        .catch(error => {
                                                            Swal.fire({
                                                                title: '오류',
                                                                text: '삭제 요청이 실패했습니다: ' + error,
                                                                icon: 'error',
                                                                confirmButtonText: '확인'
                                                            });
                                                        });
                                                }),
                                            $('<button></button>')
                                                .addClass('btn btn-secondary btn-sm')
                                                .text('뒤로가기')
                                                .on('click', function() {
                                                    messageList.empty();
                                                    loadMessages(url, messageType);
                                                })
                                        );

                                    messageList.empty();
                                    messageList.append(messageItem);
                                })
                                .catch(error => console.error('Error:', error));
                        });

                    messageList.append(listItem);
                });
            })
            .catch(error => {
                console.error('Error:', error);
                Swal.fire({
                    title: '오류',
                    text: '메시지를 불러오는데 실패했습니다. 다시 시도해주세요.',
                    icon: 'error',
                    confirmButtonText: '확인'
                });
            });
    }

    $('#send-message').on('click', function() {
        openModal('sendMessageModal');
    });

    $('#open-messages').on('click', function() {
        openModal('messageModal');
    });

    $('#receivedTab').on('click', function() {
        loadMessages('/api/messages/received', 'receiver');
    });

    $('#sentTab').on('click', function() {
        loadMessages('/api/messages/sent', 'sender');
    });

    $('.close').on('click', function() {
        closeModal($(this).data('close'));
    });

    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            closeModal(event.target.id);
        }
    };
});