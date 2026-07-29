-- Seed CU Hunt baseline data
insert into game_settings (id) values (1) on conflict (id) do nothing;

insert into big_teams (code, full_name) values
  ('梟', '巍梟壂'),
  ('焽', '翱焽烆'),
  ('赬', '玄暻赬')
on conflict (code) do nothing;

insert into small_teams (id, big_team, num)
select code || n::text, code, n
from big_teams, generate_series(1, 6) n
on conflict (id) do nothing;

insert into territories (id, name, lat, lng, image_url, linkage, curse, task_name, easy_rule, hard_rule, rain_venue) values
(1, 'YIA G/F', 22.41632, 114.21098, 'https://drive.google.com/thumbnail?id=1x7Tcaj5541k95xni-BO12vawWhVs-N9G', '我要上堂', '百慕達三角洲', '猜猜我是誰', '猜中 5 個', '猜中 10 個', 'YIA 有蓋位置'),
(2, '善草', 22.41836, 114.21015, 'https://drive.google.com/thumbnail?id=1sNgOueiccp27sWymhEXdm77Y9fCYxSzV', '新書院深度遊', null, '默數', '±6 秒', '±3 秒', '善衡書院宿舍正門外有蓋位置'),
(3, '禮拜堂', 22.41597, 114.20722, 'https://drive.google.com/thumbnail?id=1qp9R7i9ymNOLUMccxsVINmKFpI5uW7-d', '放鬆時間', null, '背金句', '5 句', '10 句', '禮拜堂建築物有蓋位置'),
(4, '新展（G/F外面）', 22.41805, 114.20809, 'https://drive.google.com/thumbnail?id=1OQ02CM4VRYtX3Cy0S9y5FEtKRKQp7pxz', '我要上堂', null, '合24', '5 題', '10 題', '新展有蓋位置'),
(5, '文廣', 22.41857, 114.20565, 'https://drive.google.com/thumbnail?id=1MfD-KA822Qyp-p5wuiyv2dk-wcEC3bQM', '人文精神', '尼斯湖水怪', '默契接龍', '完成 8 次', '完成 12 次', 'Coffee Corner 門口'),
(6, 'LSK', 22.41969, 114.20393, 'https://drive.google.com/thumbnail?id=1xEkonWfRS5OhBBoQpeRowGBXC5TtctJW', '我要上堂', null, '單腳企', '30 秒', '1 分 15 秒', 'LSK 有蓋位置'),
(7, '張祝珊', 22.42139, 114.20566, 'https://drive.google.com/thumbnail?id=1FP4HZ5b3YC_T-ZoFIeFJL4UImIXehAla', '人文精神', null, '珍珠奶茶店', '合共誤差 < $3', '合共誤差 = $0', '張祝珊內大門附近'),
(8, '圓廣', 22.42107, 114.20827, 'https://drive.google.com/thumbnail?id=1x-qWl-u2Rx9lFGXGGrN6o9MGDPGttQRJ', '人文精神', null, '找找畢業生', '10 分鐘內完成', '6 分鐘內完成', '圓廣有蓋位置'),
(9, '蒙民偉7樓', 22.42009, 114.20918, 'https://drive.google.com/thumbnail?id=1tu8TBMgHN94oqJu10MqX6fhYhscPBDTw', '我要上堂', null, '疊羅漢', '1 分 15 秒完成簡單題', '45 秒完成困難題', '蒙民偉內大門附近'),
(10, '天人合一', 22.42156, 114.20987, 'https://drive.google.com/thumbnail?id=1vU-G8YZn-sCxacBNX13ZtmMlhqQuE3Yc', '放鬆時間', null, 'IG找圖', '6 條', '15 條', '落雨時暫時關閉'),
(11, '國平', 22.42253, 114.20109, 'https://drive.google.com/thumbnail?id=1zoekd2K6fUfFew1cQr1nZ3so9uxBYJvh', '你有你嘅健康，我有我嘅健康，我哋一齊活在香港', '百慕達三角洲', '開合跳', '180 下', '300 下', '國平有蓋位置'),
(12, '敬文', 22.42535, 114.20647, 'https://drive.google.com/thumbnail?id=1kNry58UxkZL-MjBwn0iDDGCYtf11lXe7', '新書院深度遊', null, '茶餐廳', '達標指定分數', '達標指定分數', '敬文內大門附近'),
(13, 'IHouse籃球場', 22.42351, 114.20457, 'https://drive.google.com/thumbnail?id=1nRfdJKVcyIUh-h2s35sSHBhH8fEuXtEo', '你有你嘅健康，我有我嘅健康，我哋一齊活在香港', null, '射籃', '五球', '八球', '落雨時暫時關閉'),
(14, '獅子亭', 22.41603, 114.20931, 'https://drive.google.com/thumbnail?id=1-oej8Mbb0yhkjbkA_XJxjBzl-KwuSJ55', '放鬆時間', '尼斯湖水怪', '過繩', '五個人過到', '全部人過到', '獅子亭有蓋位置'),
(15, '中大賓館', 22.41977, 114.21077, 'https://drive.google.com/thumbnail?id=1hjpBV5F0F2ShLOBfociC_sR7CHHXHgs3', '放鬆時間', null, '解手', '1 分鐘', '35 秒', '中大賓館有蓋位置'),
(16, '大學體育館門口', 22.418724, 114.211322, 'https://drive.google.com/thumbnail?id=12m6NarXLrxsz5iVBLYf37Z0Pv2qcxWlO', '你有你嘅健康，我有我嘅健康，我哋一齊活在香港', null, '掌上壓', '人數 × 12', '人數 × 20', '體育館門口有蓋位置'),
(17, '民女', 22.413988, 114.209698, 'https://drive.google.com/thumbnail?id=14UVhfOd5m3b_jHbiCMvldj7y-jH2Aim_', '人文精神', null, '估歌仔', '8 首', '15 首', '民女有蓋位置'),
(18, '保健梯', 22.419273, 114.209521, 'https://drive.google.com/thumbnail?id=1c68p9oQBS-C-MIJUoJMH9u77VTwdfntx', '你有你嘅健康，我有我嘅健康，我哋一齊活在香港', null, '跑樓梯', '1 分 10 秒', '45 秒', '落雨時暫時關閉'),
(19, '五平', 22.418195, 114.207337, 'https://drive.google.com/thumbnail?id=1lOg6jzeV9b7DSluS89igvrliKZM5_Ey1', '我要上堂', null, '畫畫接力', '5 個', '8 個', '五平有蓋位置'),
(20, '伍宜孫', 22.422169, 114.202551, 'https://drive.google.com/thumbnail?id=1ZPZXLug0vA7usJCHyLFiEFj6yzh_WXB4', '新書院深度遊', null, '默契考驗', '2/5 題', '4/7 題', '伍宜孫 Lobby'),
(21, '和聲', 22.422327, 114.204356, 'https://drive.google.com/thumbnail?id=1JnYuERjzOw5Nq8yUyVWSqqxH6NF661fm', '新書院深度遊', '尼斯湖水怪', '無聲排隊', '180 秒內排好', '90 秒內排好', '和聲 Lobby'),
(22, '羅桂祥', 22.427665, 114.204063, 'https://drive.google.com/thumbnail?id=1PZmQNBwwRYfezqbXy8sSR2eA5_TPCPYL', '羅桂祥是個好地方', '百慕達三角洲', '記憶迷宮', '3 分鐘', '1.5 分鐘', '羅桂祥有蓋位置'),
(23, '羅桂祥閣', 22.418726, 114.206165, 'https://drive.google.com/thumbnail?id=1qTkQH_FHoJvWbXlKrEvvf99i6EwfS0KR', '羅桂祥是個好地方', null, '拍照留念', '1 分鐘', '30 秒', '落雨時暫時關閉'),
(24, '晨興平台', 22.419152, 114.210416, 'https://drive.google.com/thumbnail?id=1-JJR18yyFjUwdddEopVzbnexuQlc0t4Y', '新書院深度遊', null, '快譯通', '2 首歌', '4 首歌', '晨興平台有蓋位置'),
(25, '崇基門迴旋處', 22.414022, 114.208283, 'https://drive.google.com/thumbnail?id=1dpg6_ggqWmqp8qYu4h46iPgp8J1u21B7', '人文精神', null, '歧視', '七關或以下', '八關全對', '利黃瑤璧樓玻璃門內')
on conflict (id) do nothing;

insert into hunt_events (time_label, title, body) values
('15:00', '尋找 djj', '而家每個 djj 喺中大度周圍行緊，如果搵到自己 djj 並且派 3 個人出嚟同 djj 猜枚，三盤兩勝贏咗並合照就可以獲得 1000 分。'),
('16:00', '百萬大道', '請留意世界廣播詳情。'),
('17:00', '煲底', '請留意世界廣播詳情。');

insert into announcements (title, body, kind) values
('歡迎黎到 CU Hunt', '請細閱 HuntBook，注意安全。世界廣播會出現喺呢度。', 'system');
