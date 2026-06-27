const TimelineEvent = require('../models/TimelineEvent');

/**
 * Log an event to a candidate's timeline.
 * @param {mongoose.Types.ObjectId|string} candidateId
 * @param {string} type
 * @param {string} title
 * @param {string} [description]
 * @param {*} [metadata]
 * @returns {Promise<TimelineEvent>}
 */
const logEvent = async (candidateId, type, title, description = '', metadata = {}) => {
  const event = await TimelineEvent.create({
    candidateId,
    type,
    title,
    description,
    metadata
  });
  return event;
};

module.exports = { logEvent };
