-- phpMyAdmin SQL Dump
-- version 3.5.3
-- http://www.phpmyadmin.net
--
-- Värd: localhost
-- Skapad: 20 mars 2013 kl 18:45
-- Serverversion: 5.1.49
-- PHP-version: 5.3.15

SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

--
-- Databas: `dblab2`
--

DELIMITER $$
--
-- Procedurer
--
CREATE DEFINER=`dev`@`%` PROCEDURE `book`(
	IN senderKiosk INT,
	IN senderClient INT,
	IN recipientKiosk INT,
	IN recipientClient INT,
	IN amountToSend INT,
	OUT bookingDone INT)
BEGIN
	DECLARE senderCurrency VARCHAR(45);
	DECLARE recipientCurrency VARCHAR(45);
	DECLARE revenueAmount INT;
	DECLARE originalAmountToSend INT;
	SET bookingDone = 0;
	SET originalAmountToSend = amountToSend;

	SET autocommit=0;
	START TRANSACTION;
		
	-- Grab 1% revenue to sender kiosk
	SET revenueAmount = 0.01 * amountToSend;
	UPDATE Account
		INNER JOIN Kiosk ON Account.ownerEntityId = entityId
		SET amount = amount + revenueAmount
		WHERE kioskId = senderKiosk AND accountTypeId = 2 /* Revenue account */;
	-- Remove revenue amount from actual amount to send
	SET amountToSend = 0.99 * amountToSend;

	-- Exchange if required
	SELECT nativeCurrency INTO recipientCurrency FROM Kiosk WHERE kioskId = recipientKiosk;
	SELECT nativeCurrency INTO senderCurrency FROM Kiosk WHERE kioskId = senderKiosk;
	IF recipientCurrency <> senderCurrency THEN
		-- Currency is different, exchange with central bank		
		-- Add current send amount to sending currency
		UPDATE Account 
			SET amount = amount + amountToSend
			WHERE 	ownerEntityId = 1 /* CB-entity */ 
					AND currency = senderCurrency
					AND accountTypeId = 3; /* Exchange account */
		
		-- Change amountToSend to exchanged amount
		SELECT relation * amountToSend 
			INTO amountToSend 
			FROM ExchangeRate
			WHERE baseCurrency = senderCurrency AND relationCurrency = recipientCurrency;
			
		-- Remove exchanged send amount from recieving currency
		UPDATE Account 
			SET amount = amount - amountToSend
			WHERE 	ownerEntityId = 1 /* CB-entity */ 
					AND currency = recipientCurrency
					AND accountTypeId = 3; /* Exchange account */
	END IF;

	-- amountToSend now contains amount to add to recipientKiosk operational account in correct currency	
	UPDATE Account
		INNER JOIN Kiosk ON Account.ownerEntityId = entityId
		SET amount = amount + amountToSend
		WHERE kioskId = recipientKiosk AND accountTypeId = 1 /* Operational account */;

	-- As money has been transfered as required we now add a transfer post
	INSERT INTO Transfer(	sentTime, 
							recipientGrantedAmount, 
							statusCode,
							recipientClientId,
							senderClientId,
							recipientKioskId,
							senderKioskId,
							sentAmount )
	VALUES(NOW(), amountToSend, 0, recipientClient, senderClient, recipientKiosk, senderKiosk, originalAmountToSend);

	SET bookingDone = 1;
	COMMIT;
END$$

CREATE DEFINER=`dev`@`%` PROCEDURE `payout`(
	IN recipientKiosk INT,
	IN recipientClient INT,
	OUT amountPayout int,
	OUT currency VARCHAR(45))
BEGIN
	SET autocommit=0;
	START TRANSACTION;
	SELECT SUM(recipientGrantedAmount) 
		INTO amountPayout 
		FROM Transfer
		WHERE 	recipientClientId = recipientClient
				AND recipientKioskId = recipientKiosk
				AND statusCode = 0;
	CASE WHEN amountPayout is null THEN
		ROLLBACK; -- abort payout
	ELSE
		-- Perform payout procedure
		-- Reduce amount in operational account
		UPDATE Account a
			INNER JOIN Entity e ON e.entityId = a.ownerEntityId 
			INNER JOIN Kiosk k ON e.entityId = k.entityId
			SET a.amount = a.amount - amountPayout			
			WHERE k.kioskId = recipientKiosk AND a.accountTypeId = 1 /*Operational account*/;
		-- Set transfers to collected
		UPDATE Transfer t
			SET t.statusCode = 1,
				t.collectedTime = NOW()
			WHERE	recipientClientId = recipientClient
					AND recipientKioskId = recipientKiosk
					AND statusCode = 0;
		SELECT nativeCurrency
			INTO currency
			FROM Kiosk
			WHERE kioskId = recipientKiosk;
		COMMIT;
	END CASE;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Tabellstruktur `Account`
--

CREATE TABLE IF NOT EXISTS `Account` (
  `accountId` int(11) NOT NULL AUTO_INCREMENT,
  `amount` int(11) NOT NULL DEFAULT '0',
  `ownerEntityId` int(11) NOT NULL,
  `currency` varchar(45) NOT NULL,
  `accountTypeId` int(11) NOT NULL,
  PRIMARY KEY (`accountId`),
  KEY `ownerEntityForeignKey_idx` (`ownerEntityId`),
  KEY `curFK_idx` (`currency`),
  KEY `atFK_idx` (`accountTypeId`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=8 ;

--
-- Dumpning av Data i tabell `Account`
--

INSERT INTO `Account` (`accountId`, `amount`, `ownerEntityId`, `currency`, `accountTypeId`) VALUES
(1, 25002, 2, 'sek', 1),
(2, 6270, 2, 'sek', 2),
(3, 19341, 3, 'usd', 1),
(4, 13138, 3, 'usd', 2),
(5, 10000000, 1, 'sek', 3),
(6, 10000000, 1, 'eur', 3),
(7, 10000000, 1, 'usd', 3);

-- --------------------------------------------------------

--
-- Tabellstruktur `AccountType`
--

CREATE TABLE IF NOT EXISTS `AccountType` (
  `accountTypeId` int(11) NOT NULL AUTO_INCREMENT,
  `type` varchar(45) CHARACTER SET latin1 NOT NULL,
  PRIMARY KEY (`accountTypeId`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=4 ;

--
-- Dumpning av Data i tabell `AccountType`
--

INSERT INTO `AccountType` (`accountTypeId`, `type`) VALUES
(1, 'Operational account'),
(2, 'Revenue account'),
(3, 'Exchange account');

-- --------------------------------------------------------

--
-- Tabellstruktur `Adress`
--

CREATE TABLE IF NOT EXISTS `Adress` (
  `adressId` int(11) NOT NULL AUTO_INCREMENT,
  `adress` varchar(145) NOT NULL,
  `country` varchar(45) NOT NULL,
  PRIMARY KEY (`adressId`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=3 ;

--
-- Dumpning av Data i tabell `Adress`
--

INSERT INTO `Adress` (`adressId`, `adress`, `country`) VALUES
(1, 'Kungsgatan', 'Sweden'),
(2, 'Testgatan', 'Germany');

-- --------------------------------------------------------

--
-- Tabellstruktur `Client`
--

CREATE TABLE IF NOT EXISTS `Client` (
  `clientId` int(11) NOT NULL AUTO_INCREMENT,
  `passportId` varchar(100) NOT NULL,
  `fullName` varchar(45) NOT NULL,
  PRIMARY KEY (`clientId`),
  UNIQUE KEY `passportId_UNIQUE` (`passportId`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=3 ;

--
-- Dumpning av Data i tabell `Client`
--

INSERT INTO `Client` (`clientId`, `passportId`, `fullName`) VALUES
(1, '123', 'svensken banan'),
(2, '456', 'tysken hejs');

-- --------------------------------------------------------

--
-- Tabellstruktur `Currency`
--

CREATE TABLE IF NOT EXISTS `Currency` (
  `currencyId` varchar(45) NOT NULL,
  PRIMARY KEY (`currencyId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumpning av Data i tabell `Currency`
--

INSERT INTO `Currency` (`currencyId`) VALUES
('eur'),
('sek'),
('usd');

-- --------------------------------------------------------

--
-- Tabellstruktur `Entity`
--

CREATE TABLE IF NOT EXISTS `Entity` (
  `entityId` int(11) NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`entityId`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=4 ;

--
-- Dumpning av Data i tabell `Entity`
--

INSERT INTO `Entity` (`entityId`) VALUES
(1),
(2),
(3);

-- --------------------------------------------------------

--
-- Tabellstruktur `ExchangeRate`
--

CREATE TABLE IF NOT EXISTS `ExchangeRate` (
  `baseCurrency` varchar(45) NOT NULL,
  `relationCurrency` varchar(45) NOT NULL,
  `relation` float NOT NULL,
  PRIMARY KEY (`baseCurrency`,`relationCurrency`),
  KEY `relationCurrency` (`relationCurrency`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumpning av Data i tabell `ExchangeRate`
--

INSERT INTO `ExchangeRate` (`baseCurrency`, `relationCurrency`, `relation`) VALUES
('eur', 'sek', 9.5),
('sek', 'eur', 0.1),
('sek', 'usd', 0.14),
('usd', 'sek', 6.5);

-- --------------------------------------------------------

--
-- Tabellstruktur `Kiosk`
--

CREATE TABLE IF NOT EXISTS `Kiosk` (
  `kioskId` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(145) NOT NULL,
  `entityId` int(11) NOT NULL,
  `adressId` int(11) NOT NULL,
  `password` varchar(45) NOT NULL,
  `nativeCurrency` varchar(45) NOT NULL,
  PRIMARY KEY (`kioskId`),
  KEY `adresForeignKey_idx` (`adressId`),
  KEY `entityForeignKey_idx` (`entityId`),
  KEY `nativeCForeignKey_idx` (`nativeCurrency`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=3 ;

--
-- Dumpning av Data i tabell `Kiosk`
--

INSERT INTO `Kiosk` (`kioskId`, `name`, `entityId`, `adressId`, `password`, `nativeCurrency`) VALUES
(1, 'Kungskiosken', 2, 1, 'qwe', 'sek'),
(2, 'Testkiosken', 3, 2, 'asd', 'usd');

-- --------------------------------------------------------

--
-- Tabellstruktur `Transfer`
--

CREATE TABLE IF NOT EXISTS `Transfer` (
  `transferId` int(11) NOT NULL AUTO_INCREMENT,
  `sentTime` datetime DEFAULT NULL,
  `collectedTime` datetime DEFAULT NULL,
  `recipientGrantedAmount` int(11) DEFAULT NULL,
  `statusCode` int(11) NOT NULL,
  `recipientClientId` int(11) NOT NULL,
  `senderClientId` int(11) NOT NULL,
  `recipientKioskId` int(11) NOT NULL,
  `senderKioskid` int(11) NOT NULL,
  `sentAmount` int(11) NOT NULL,
  PRIMARY KEY (`transferId`),
  KEY `statusForeignKey_idx` (`statusCode`),
  KEY `recipientClientForeignKey_idx` (`recipientClientId`),
  KEY `senderClientForeignKey_idx` (`senderClientId`),
  KEY `recipientKioskForeignKey_idx` (`recipientKioskId`),
  KEY `senderKioskForeignKey_idx` (`senderKioskid`)
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=33 ;

--
-- Dumpning av Data i tabell `Transfer`
--

INSERT INTO `Transfer` (`transferId`, `sentTime`, `collectedTime`, `recipientGrantedAmount`, `statusCode`, `recipientClientId`, `senderClientId`, `recipientKioskId`, `senderKioskid`, `sentAmount`) VALUES
(1, '2012-01-03 22:15:00', '2013-03-20 14:18:52', 200, 1, 1, 2, 1, 2, 50),
(2, '2012-01-03 22:15:00', '2013-03-20 14:19:59', 150, 1, 1, 2, 1, 2, 25),
(3, '2012-01-03 22:15:00', '2013-03-20 16:50:54', 350, 1, 1, 2, 1, 2, 75),
(4, '2013-03-20 16:13:07', '2013-03-20 16:52:02', 644, 1, 1, 2, 1, 2, 100),
(5, '2013-03-20 17:51:12', '2013-03-20 17:52:16', 14, 1, 2, 1, 2, 1, 100),
(6, '2013-03-20 17:51:48', '2013-03-20 17:52:16', 139, 1, 2, 1, 2, 1, 1000),
(10, '2013-03-20 18:01:22', '2013-03-20 18:06:08', 2, 1, 1, 1, 2, 1, 12),
(11, '2013-03-20 18:01:47', '2013-03-20 18:08:18', 4, 1, 2, 1, 2, 1, 32),
(13, '2013-03-20 18:05:12', '2013-03-20 18:08:18', 1, 1, 2, 1, 2, 1, 4),
(14, '2013-03-20 18:05:20', '2013-03-20 18:08:18', 42, 1, 2, 1, 2, 1, 300),
(16, '2013-03-20 18:05:40', '2013-03-20 18:06:08', 57, 1, 1, 2, 2, 1, 411),
(17, '2013-03-20 18:08:55', '2013-03-20 18:09:19', 17, 1, 2, 1, 2, 1, 123),
(18, '2013-03-20 18:11:50', '2013-03-20 18:12:15', 793, 1, 2, 1, 1, 2, 123),
(19, '2013-03-20 18:13:03', '2013-03-20 18:13:08', 793, 1, 2, 1, 1, 2, 123),
(20, '2013-03-20 18:13:22', '2013-03-20 18:13:50', 57, 1, 1, 1, 2, 1, 411),
(21, '2013-03-20 18:19:47', '2013-03-20 18:26:14', 1008, 1, 2, 1, 1, 2, 157),
(22, '2013-03-20 18:24:50', '2013-03-20 18:27:08', 3, 1, 2, 1, 2, 1, 23),
(23, '2013-03-20 18:25:40', '2013-03-20 18:26:30', 17, 1, 1, 2, 2, 1, 123),
(24, '2013-03-20 18:25:54', '2013-03-20 18:26:30', 43, 1, 1, 2, 2, 1, 312),
(25, '2013-03-20 18:27:18', '2013-03-20 18:27:36', 6, 1, 2, 1, 2, 1, 41),
(26, '2013-03-20 18:27:24', '2013-03-20 18:27:36', 0, 1, 2, 1, 2, 1, 2),
(27, '2013-03-20 18:35:17', NULL, 2, 0, 2, 1, 2, 1, 13),
(28, '2013-03-20 18:35:27', NULL, 6, 0, 1, 2, 2, 1, 41),
(29, '2013-03-20 18:36:21', NULL, 17, 0, 1, 1, 2, 1, 123),
(30, '2013-03-20 18:37:41', NULL, 17065, 0, 2, 1, 2, 1, 123123),
(31, '2013-03-20 18:38:13', '2013-03-20 18:38:27', 2661080, 1, 2, 1, 1, 2, 413532),
(32, '2013-03-20 18:38:42', NULL, 20690, 0, 2, 1, 1, 2, 3215);

--
-- Restriktioner för dumpade tabeller
--

--
-- Restriktioner för tabell `Account`
--
ALTER TABLE `Account`
  ADD CONSTRAINT `Account_ibfk_3` FOREIGN KEY (`currency`) REFERENCES `Currency` (`currencyId`),
  ADD CONSTRAINT `Account_ibfk_1` FOREIGN KEY (`ownerEntityId`) REFERENCES `Entity` (`entityId`),
  ADD CONSTRAINT `Account_ibfk_2` FOREIGN KEY (`accountTypeId`) REFERENCES `AccountType` (`accountTypeId`);

--
-- Restriktioner för tabell `ExchangeRate`
--
ALTER TABLE `ExchangeRate`
  ADD CONSTRAINT `ExchangeRate_ibfk_1` FOREIGN KEY (`baseCurrency`) REFERENCES `Currency` (`currencyId`),
  ADD CONSTRAINT `ExchangeRate_ibfk_2` FOREIGN KEY (`relationCurrency`) REFERENCES `Currency` (`currencyId`);

--
-- Restriktioner för tabell `Kiosk`
--
ALTER TABLE `Kiosk`
  ADD CONSTRAINT `nativeCForeignKey` FOREIGN KEY (`nativeCurrency`) REFERENCES `Currency` (`currencyId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `adressForeignKey` FOREIGN KEY (`adressId`) REFERENCES `Adress` (`adressId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `entityForeignKey` FOREIGN KEY (`entityId`) REFERENCES `Entity` (`entityId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Restriktioner för tabell `Transfer`
--
ALTER TABLE `Transfer`
  ADD CONSTRAINT `recipientClientForeignKey` FOREIGN KEY (`recipientClientId`) REFERENCES `Client` (`clientId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `recipientKioskForeignKey` FOREIGN KEY (`recipientKioskId`) REFERENCES `Kiosk` (`kioskId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `senderClientForeignKey` FOREIGN KEY (`senderClientId`) REFERENCES `Client` (`clientId`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `senderKioskForeignKey` FOREIGN KEY (`senderKioskid`) REFERENCES `Kiosk` (`kioskId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
